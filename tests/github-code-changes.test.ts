import { describe, expect, it, vi } from 'vitest';

import {
  calculateCodeChanges,
  fetchRepositoriesCodeChanges,
  fetchRepositoryCodeChanges,
  type GitHubClient,
} from '../packages/core/src/github/index.js';

function contributor(
  login: string,
  weeks: ReadonlyArray<readonly [additions: number, deletions: number]>,
) {
  return {
    author: { login },
    weeks: weeks.map(([additions, deletions]) => ({
      w: 0,
      a: additions,
      d: deletions,
      c: 1,
    })),
  };
}

function createFakeClient(
  getContributorsStats: (params: { owner: string; repo: string }) => Promise<{
    status: number;
    data: unknown;
  }>,
) {
  return {
    rest: {
      repos: {
        getContributorsStats,
      },
    },
  };
}

const noSleep = vi.fn(() => Promise.resolve());

describe('calculateCodeChanges', () => {
  it('sums additions, deletions, and total', () => {
    expect(
      calculateCodeChanges([
        { additions: 500, deletions: 100 },
        { additions: 200, deletions: 50 },
      ]),
    ).toEqual({
      additions: 700,
      deletions: 150,
      total: 850,
      complete: true,
      repositoriesProcessed: 2,
      repositoriesSkipped: 0,
    });
  });

  it('returns zeros when there are no repositories', () => {
    expect(calculateCodeChanges([])).toEqual({
      additions: 0,
      deletions: 0,
      total: 0,
      complete: true,
      repositoriesProcessed: 0,
      repositoriesSkipped: 0,
    });
  });

  it('marks the result incomplete when a repository was skipped', () => {
    expect(
      calculateCodeChanges([
        { additions: 80, deletions: 20, counted: true },
        { additions: 0, deletions: 0, counted: false },
      ]),
    ).toEqual({
      additions: 80,
      deletions: 20,
      total: 100,
      complete: false,
      repositoriesProcessed: 1,
      repositoriesSkipped: 1,
    });
  });
});

describe('fetchRepositoryCodeChanges', () => {
  it('sums weekly additions and deletions for one contributor', async () => {
    const getContributorsStats = vi.fn().mockResolvedValue({
      status: 200,
      data: [
        contributor('octocat', [
          [10, 2],
          [5, 1],
        ]),
      ],
    });

    await expect(
      fetchRepositoryCodeChanges(
        createFakeClient(getContributorsStats),
        { fullName: 'octocat/hello-world' },
        'octocat',
      ),
    ).resolves.toEqual({
      additions: 15,
      deletions: 3,
      counted: true,
    });

    expect(getContributorsStats).toHaveBeenCalledWith({
      owner: 'octocat',
      repo: 'hello-world',
    });
  });

  it('matches contributor logins without regard to casing', async () => {
    const getContributorsStats = vi.fn().mockResolvedValue({
      status: 200,
      data: [contributor('OctoCat', [[8, 4]])],
    });

    await expect(
      fetchRepositoryCodeChanges(
        createFakeClient(getContributorsStats),
        { fullName: 'octocat/hello-world' },
        'OCTOCAT',
      ),
    ).resolves.toEqual({
      additions: 8,
      deletions: 4,
      counted: true,
    });
  });

  it('counts a repository as zero when the user is not a contributor', async () => {
    const getContributorsStats = vi.fn().mockResolvedValue({
      status: 200,
      data: [contributor('someone-else', [[100, 50]])],
    });

    await expect(
      fetchRepositoryCodeChanges(
        createFakeClient(getContributorsStats),
        { fullName: 'octocat/hello-world' },
        'octocat',
      ),
    ).resolves.toEqual({
      additions: 0,
      deletions: 0,
      counted: true,
    });
  });

  it('counts a contributor with no weekly changes as zero', async () => {
    const getContributorsStats = vi.fn().mockResolvedValue({
      status: 200,
      data: [
        contributor('octocat', [
          [0, 0],
          [0, 0],
        ]),
      ],
    });

    await expect(
      fetchRepositoryCodeChanges(
        createFakeClient(getContributorsStats),
        { fullName: 'octocat/hello-world' },
        'octocat',
      ),
    ).resolves.toEqual({
      additions: 0,
      deletions: 0,
      counted: true,
    });
  });

  it('retries a 202 response a limited number of times', async () => {
    const getContributorsStats = vi
      .fn()
      .mockResolvedValueOnce({ status: 202, data: '' })
      .mockResolvedValueOnce({
        status: 200,
        data: [contributor('octocat', [[3, 1]])],
      });

    await expect(
      fetchRepositoryCodeChanges(
        createFakeClient(getContributorsStats),
        { fullName: 'octocat/hello-world' },
        'octocat',
        { sleep: noSleep, retryDelayMs: 25, maxRetries: 2 },
      ),
    ).resolves.toEqual({
      additions: 3,
      deletions: 1,
      counted: true,
    });

    expect(getContributorsStats).toHaveBeenCalledTimes(2);
    expect(noSleep).toHaveBeenCalledWith(25);
  });

  it('skips a repository that stays pending after retries', async () => {
    const getContributorsStats = vi.fn().mockResolvedValue({
      status: 202,
      data: '',
    });
    const sleep = vi.fn(() => Promise.resolve());

    await expect(
      fetchRepositoryCodeChanges(
        createFakeClient(getContributorsStats),
        { fullName: 'octocat/hello-world' },
        'octocat',
        { sleep, retryDelayMs: 10, maxRetries: 2 },
      ),
    ).resolves.toEqual({
      additions: 0,
      deletions: 0,
      counted: false,
    });

    expect(getContributorsStats).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('retries a thrown 202 and then skips if still unavailable', async () => {
    const pending = Object.assign(new Error('Accepted'), { status: 202 });
    const getContributorsStats = vi.fn().mockRejectedValue(pending);
    const sleep = vi.fn(() => Promise.resolve());

    await expect(
      fetchRepositoryCodeChanges(
        createFakeClient(getContributorsStats),
        { fullName: 'octocat/hello-world' },
        'octocat',
        { sleep, maxRetries: 1, retryDelayMs: 5 },
      ),
    ).resolves.toEqual({
      additions: 0,
      deletions: 0,
      counted: false,
    });

    expect(getContributorsStats).toHaveBeenCalledTimes(2);
  });

  it('skips a repository whose additions and deletions are unusable', async () => {
    const getContributorsStats = vi.fn().mockResolvedValue({
      status: 200,
      data: [
        {
          author: { login: 'octocat' },
          weeks: [{ w: 0, a: '12', d: 1 }],
        },
      ],
    });

    await expect(
      fetchRepositoryCodeChanges(
        createFakeClient(getContributorsStats),
        { fullName: 'octocat/hello-world' },
        'octocat',
      ),
    ).resolves.toEqual({
      additions: 0,
      deletions: 0,
      counted: false,
    });
  });

  it('skips a repository-level HTTP failure without aborting', async () => {
    const getContributorsStats = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('Not Found'), { status: 404 }),
      );

    await expect(
      fetchRepositoryCodeChanges(
        createFakeClient(getContributorsStats),
        { fullName: 'octocat/hello-world' },
        'octocat',
      ),
    ).resolves.toEqual({
      additions: 0,
      deletions: 0,
      counted: false,
    });
  });

  it('propagates an authentication error', async () => {
    const apiError = Object.assign(new Error('Bad credentials'), {
      status: 401,
    });
    const getContributorsStats = vi.fn().mockRejectedValue(apiError);

    await expect(
      fetchRepositoryCodeChanges(
        createFakeClient(getContributorsStats),
        { fullName: 'octocat/hello-world' },
        'octocat',
      ),
    ).rejects.toBe(apiError);
  });

  it('accepts the project GitHub client type', () => {
    const fetchFromClient: (
      client: GitHubClient,
      repository: { fullName: string },
      username: string,
    ) => ReturnType<typeof fetchRepositoryCodeChanges> =
      fetchRepositoryCodeChanges;

    expect(fetchFromClient).toBe(fetchRepositoryCodeChanges);
  });
});

describe('fetchRepositoriesCodeChanges', () => {
  it('aggregates counted repositories and skipped ones', async () => {
    const getContributorsStats = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        data: [contributor('octocat', [[20, 5]])],
      })
      .mockResolvedValueOnce({
        status: 200,
        data: [contributor('somebody-else', [[99, 1]])],
      })
      .mockResolvedValueOnce({ status: 202, data: '' });

    await expect(
      fetchRepositoriesCodeChanges(
        createFakeClient(getContributorsStats),
        [
          { fullName: 'octocat/one' },
          { fullName: 'octocat/two' },
          { fullName: 'octocat/pending' },
        ],
        'octocat',
        { sleep: noSleep, maxRetries: 0 },
      ),
    ).resolves.toEqual({
      additions: 20,
      deletions: 5,
      total: 25,
      complete: false,
      repositoriesProcessed: 2,
      repositoriesSkipped: 1,
    });
  });

  it('returns a complete zero result when the user has no code changes', async () => {
    const getContributorsStats = vi.fn().mockResolvedValue({
      status: 200,
      data: [contributor('octocat', [[0, 0]])],
    });

    await expect(
      fetchRepositoriesCodeChanges(
        createFakeClient(getContributorsStats),
        [{ fullName: 'octocat/hello-world' }],
        'octocat',
      ),
    ).resolves.toEqual({
      additions: 0,
      deletions: 0,
      total: 0,
      complete: true,
      repositoriesProcessed: 1,
      repositoriesSkipped: 0,
    });
  });
});
