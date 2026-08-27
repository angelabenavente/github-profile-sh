import { describe, expect, it, vi } from 'vitest';

import {
  aggregateLanguages,
  calculateTopLanguages,
  fetchRepositoriesLanguages,
  fetchRepositoryLanguages,
  type GitHubClient,
} from '../packages/core/src/github/index.js';

function createFakeClient(
  listLanguages: (params: { owner: string; repo: string }) => Promise<{
    data: Record<string, number>;
  }>,
) {
  return {
    rest: {
      repos: {
        listLanguages,
      },
    },
  };
}

describe('fetchRepositoryLanguages', () => {
  it('returns the language byte map for one repository', async () => {
    const listLanguages = vi.fn().mockResolvedValue({
      data: {
        TypeScript: 62000,
        Rust: 25000,
      },
    });

    await expect(
      fetchRepositoryLanguages(createFakeClient(listLanguages), {
        fullName: 'octocat/hello-world',
      }),
    ).resolves.toEqual({
      TypeScript: 62000,
      Rust: 25000,
    });

    expect(listLanguages).toHaveBeenCalledWith({
      owner: 'octocat',
      repo: 'hello-world',
    });
  });

  it('returns an empty map when a repository has no languages', async () => {
    const listLanguages = vi.fn().mockResolvedValue({ data: {} });

    await expect(
      fetchRepositoryLanguages(createFakeClient(listLanguages), {
        fullName: 'octocat/empty',
      }),
    ).resolves.toEqual({});
  });

  it('keeps GitHub language names unchanged', async () => {
    const listLanguages = vi.fn().mockResolvedValue({
      data: {
        'C++': 10,
        'C#': 20,
        'Objective-C': 30,
        'Jupyter Notebook': 40,
        Shell: 50,
      },
    });

    await expect(
      fetchRepositoryLanguages(createFakeClient(listLanguages), {
        fullName: 'octocat/polyglot',
      }),
    ).resolves.toEqual({
      'C++': 10,
      'C#': 20,
      'Objective-C': 30,
      'Jupyter Notebook': 40,
      Shell: 50,
    });
  });

  it.each([
    [Object.assign(new Error('Not Found'), { status: 404 })],
    [Object.assign(new Error('API rate limit exceeded'), { status: 403 })],
    [new Error('GitHub API is unavailable')],
  ])('propagates $message from the client', async (apiError) => {
    const listLanguages = vi.fn().mockRejectedValue(apiError);

    await expect(
      fetchRepositoryLanguages(createFakeClient(listLanguages), {
        fullName: 'octocat/missing',
      }),
    ).rejects.toBe(apiError);
  });

  it('accepts the project GitHub client type', () => {
    const fetchFromClient: (
      client: GitHubClient,
      repository: { fullName: string },
    ) => ReturnType<typeof fetchRepositoryLanguages> = fetchRepositoryLanguages;

    expect(fetchFromClient).toBe(fetchRepositoryLanguages);
  });
});

describe('fetchRepositoriesLanguages', () => {
  it('fetches each public repository sequentially', async () => {
    const listLanguages = vi
      .fn()
      .mockResolvedValueOnce({ data: { TypeScript: 100 } })
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: { Rust: 50 } });

    await expect(
      fetchRepositoriesLanguages(createFakeClient(listLanguages), [
        { fullName: 'octocat/one' },
        { fullName: 'octocat/empty' },
        { fullName: 'octocat/two' },
      ]),
    ).resolves.toEqual([{ TypeScript: 100 }, {}, { Rust: 50 }]);

    expect(listLanguages).toHaveBeenCalledTimes(3);
    expect(listLanguages).toHaveBeenNthCalledWith(1, {
      owner: 'octocat',
      repo: 'one',
    });
    expect(listLanguages).toHaveBeenNthCalledWith(3, {
      owner: 'octocat',
      repo: 'two',
    });
  });

  it('returns an empty list when the user has no repositories', async () => {
    const listLanguages = vi.fn();

    await expect(
      fetchRepositoriesLanguages(createFakeClient(listLanguages), []),
    ).resolves.toEqual([]);

    expect(listLanguages).not.toHaveBeenCalled();
  });
});

describe('aggregateLanguages', () => {
  it('aggregates a single repository', () => {
    expect(
      aggregateLanguages([
        {
          TypeScript: 600,
          Rust: 400,
        },
      ]),
    ).toEqual([
      { name: 'TypeScript', bytes: 600, percentage: 60 },
      { name: 'Rust', bytes: 400, percentage: 40 },
    ]);
  });

  it('sums the same language across repositories', () => {
    expect(
      aggregateLanguages([
        { TypeScript: 200, Rust: 100 },
        { TypeScript: 300, Go: 400 },
      ]),
    ).toEqual([
      { name: 'TypeScript', bytes: 500, percentage: 50 },
      { name: 'Go', bytes: 400, percentage: 40 },
      { name: 'Rust', bytes: 100, percentage: 10 },
    ]);
  });

  it('ignores repositories without languages', () => {
    expect(
      aggregateLanguages([{ TypeScript: 100 }, {}, { Rust: 100 }]),
    ).toEqual([
      { name: 'Rust', bytes: 100, percentage: 50 },
      { name: 'TypeScript', bytes: 100, percentage: 50 },
    ]);
  });

  it('returns an empty list when there are no language bytes', () => {
    expect(aggregateLanguages([])).toEqual([]);
    expect(aggregateLanguages([{}, {}])).toEqual([]);
  });

  it('orders by bytes descending, then by name', () => {
    expect(
      aggregateLanguages([{ Go: 100, Rust: 200, TypeScript: 200 }]),
    ).toEqual([
      { name: 'Rust', bytes: 200, percentage: 40 },
      { name: 'TypeScript', bytes: 200, percentage: 40 },
      { name: 'Go', bytes: 100, percentage: 20 },
    ]);
  });
});

describe('calculateTopLanguages', () => {
  it('returns at most the top 3 languages', () => {
    expect(
      calculateTopLanguages([
        {
          TypeScript: 400,
          Rust: 300,
          Go: 200,
          Shell: 100,
        },
      ]),
    ).toEqual([
      { name: 'TypeScript', bytes: 400, percentage: 40 },
      { name: 'Rust', bytes: 300, percentage: 30 },
      { name: 'Go', bytes: 200, percentage: 20 },
    ]);
  });

  it('keeps percentages relative to every aggregated language', () => {
    const [first] = calculateTopLanguages([
      {
        TypeScript: 50,
        Rust: 30,
        Go: 10,
        Shell: 10,
      },
    ]);

    expect(first).toMatchObject({ name: 'TypeScript', percentage: 50 });
  });
});
