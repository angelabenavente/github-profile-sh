import { describe, expect, it, vi } from 'vitest';

import {
  calculateTotalStars,
  fetchPublicRepositories,
  type GitHubClient,
  type PublicRepository,
} from '../packages/core/src/github/index.js';

type GitHubRepoFixture = {
  name: string;
  full_name: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  fork: boolean;
  archived: boolean;
  html_url: string;
};

const helloWorld: GitHubRepoFixture = {
  name: 'hello-world',
  full_name: 'octocat/hello-world',
  stargazers_count: 80,
  forks_count: 9,
  language: 'TypeScript',
  fork: false,
  archived: false,
  html_url: 'https://github.com/octocat/hello-world',
};

function githubRepo(
  overrides: Partial<GitHubRepoFixture> = {},
): GitHubRepoFixture {
  return {
    ...helloWorld,
    ...overrides,
  };
}

function createFakeClient(
  paginate: (
    endpoint: unknown,
    params: { username: string; per_page: number; type: 'owner' },
  ) => Promise<Array<typeof helloWorld>>,
) {
  const listForUser = vi.fn();

  return {
    paginate,
    rest: {
      repos: {
        listForUser,
      },
    },
  };
}

describe('fetchPublicRepositories', () => {
  it('maps a repository to PublicRepository', async () => {
    const paginate = vi.fn().mockResolvedValue([helloWorld]);
    const client = createFakeClient(paginate);

    await expect(fetchPublicRepositories(client, 'octocat')).resolves.toEqual([
      {
        name: 'hello-world',
        fullName: 'octocat/hello-world',
        stars: 80,
        forks: 9,
        language: 'TypeScript',
        isFork: false,
        archived: false,
        repoUrl: 'https://github.com/octocat/hello-world',
      },
    ]);

    expect(paginate).toHaveBeenCalledWith(client.rest.repos.listForUser, {
      username: 'octocat',
      per_page: 100,
      type: 'owner',
    });
  });

  it('maps every repository in the response', async () => {
    const paginate = vi.fn().mockResolvedValue([
      githubRepo({
        name: 'alpha',
        full_name: 'octocat/alpha',
        stargazers_count: 1,
      }),
      githubRepo({
        name: 'beta',
        full_name: 'octocat/beta',
        stargazers_count: 2,
      }),
    ]);

    await expect(
      fetchPublicRepositories(createFakeClient(paginate), 'octocat'),
    ).resolves.toMatchObject([
      { name: 'alpha', stars: 1 },
      { name: 'beta', stars: 2 },
    ]);
  });

  it('keeps repositories from every page', async () => {
    const pageOne = Array.from({ length: 100 }, (_, index) =>
      githubRepo({
        name: `repo-${index + 1}`,
        full_name: `octocat/repo-${index + 1}`,
        stargazers_count: index + 1,
      }),
    );
    const pageTwo = [
      githubRepo({
        name: 'repo-101',
        full_name: 'octocat/repo-101',
        stargazers_count: 101,
      }),
    ];
    const paginate = vi.fn().mockResolvedValue([...pageOne, ...pageTwo]);

    const repositories = await fetchPublicRepositories(
      createFakeClient(paginate),
      'octocat',
    );

    expect(paginate).toHaveBeenCalledWith(expect.any(Function), {
      username: 'octocat',
      per_page: 100,
      type: 'owner',
    });
    expect(repositories).toHaveLength(101);
    expect(repositories[0]?.name).toBe('repo-1');
    expect(repositories[100]?.name).toBe('repo-101');
    expect(repositories[100]?.stars).toBe(101);
  });

  it('keeps a null language', async () => {
    const paginate = vi
      .fn()
      .mockResolvedValue([githubRepo({ language: null })]);

    await expect(
      fetchPublicRepositories(createFakeClient(paginate), 'octocat'),
    ).resolves.toMatchObject([{ language: null }]);
  });

  it('includes public forks without filtering them', async () => {
    const paginate = vi.fn().mockResolvedValue([
      githubRepo({
        name: 'upstream-fork',
        full_name: 'octocat/upstream-fork',
        fork: true,
        stargazers_count: 12,
      }),
    ]);

    await expect(
      fetchPublicRepositories(createFakeClient(paginate), 'octocat'),
    ).resolves.toMatchObject([
      {
        name: 'upstream-fork',
        isFork: true,
        stars: 12,
      },
    ]);
  });

  it('includes archived repositories', async () => {
    const paginate = vi.fn().mockResolvedValue([
      githubRepo({
        name: 'legacy',
        archived: true,
      }),
    ]);

    await expect(
      fetchPublicRepositories(createFakeClient(paginate), 'octocat'),
    ).resolves.toMatchObject([{ name: 'legacy', archived: true }]);
  });

  it.each(['', '   ', '\n'])(
    'rejects an empty username %j',
    async (username) => {
      const paginate = vi.fn();

      await expect(
        fetchPublicRepositories(createFakeClient(paginate), username),
      ).rejects.toThrowError(
        'Invalid GitHub username: expected a non-empty string',
      );

      expect(paginate).not.toHaveBeenCalled();
    },
  );

  it('propagates API errors from the client', async () => {
    const apiError = new Error('API rate limit exceeded');
    const paginate = vi.fn().mockRejectedValue(apiError);

    await expect(
      fetchPublicRepositories(createFakeClient(paginate), 'octocat'),
    ).rejects.toBe(apiError);
  });

  it('accepts the project GitHub client type', () => {
    const fetchFromClient: (
      client: GitHubClient,
      username: string,
    ) => ReturnType<typeof fetchPublicRepositories> = fetchPublicRepositories;

    expect(fetchFromClient).toBe(fetchPublicRepositories);
  });
});

describe('calculateTotalStars', () => {
  const repo = (
    stars: number,
    overrides: Partial<PublicRepository> = {},
  ): PublicRepository => ({
    name: 'repo',
    fullName: 'octocat/repo',
    stars,
    forks: 0,
    language: 'TypeScript',
    isFork: false,
    archived: false,
    repoUrl: 'https://github.com/octocat/repo',
    ...overrides,
  });

  it('sums stars across every public repository', () => {
    expect(
      calculateTotalStars([
        repo(80),
        repo(20, { name: 'docs', isFork: true }),
        repo(3, { name: 'legacy', archived: true }),
      ]),
    ).toBe(103);
  });

  it('returns 0 when there are no repositories', () => {
    expect(calculateTotalStars([])).toBe(0);
  });

  it('treats repositories with 0 stars as zero, not missing', () => {
    expect(calculateTotalStars([repo(0), repo(5), repo(0)])).toBe(5);
  });
});
