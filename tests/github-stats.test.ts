import { describe, expect, it, vi } from 'vitest';

import {
  fetchProfileStats,
  type GitHubClient,
  type GitHubProfile,
  type PublicRepository,
} from '../packages/core/src/github/index.js';

const unusedClient = {} as unknown as GitHubClient;

const profile: GitHubProfile = {
  username: 'octocat',
  name: 'The Octocat',
  bio: null,
  publicRepos: 2,
  followers: 0,
  following: 0,
  createdAt: '2011-01-25T18:44:36Z',
  profileUrl: 'https://github.com/octocat',
};

const repositories: PublicRepository[] = [
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
  {
    name: 'docs',
    fullName: 'octocat/docs',
    stars: 20,
    forks: 1,
    language: 'Markdown',
    isFork: true,
    archived: false,
    repoUrl: 'https://github.com/octocat/docs',
  },
];

function resolved<T>(value: T) {
  return () => Promise.resolve(value);
}

describe('fetchProfileStats', () => {
  it('assembles normalized profile stats from existing modules', async () => {
    const fetchContributions = vi.fn().mockResolvedValue([
      { date: '2026-08-27', count: 1 },
      { date: '2026-08-28', count: 2 },
      { date: '2026-08-29', count: 3 },
    ]);

    await expect(
      fetchProfileStats(unusedClient, 'OctoCat', {
        today: '2026-08-29',
        fetchProfile: resolved(profile),
        fetchRepositories: resolved(repositories),
        fetchContributions,
        fetchLanguages: resolved([{ TypeScript: 600, Rust: 300, Go: 100 }]),
        fetchCodeChanges: resolved({
          additions: 6000,
          deletions: 2400,
          total: 8400,
          complete: true,
          repositoriesProcessed: 2,
          repositoriesSkipped: 0,
        }),
      }),
    ).resolves.toEqual({
      username: 'octocat',
      repos: 2,
      stars: 100,
      currentStreak: 3,
      codeChanges: {
        additions: 6000,
        deletions: 2400,
        total: 8400,
        complete: true,
      },
      topLanguages: [
        { name: 'TypeScript', bytes: 600, percentage: 60 },
        { name: 'Rust', bytes: 300, percentage: 30 },
        { name: 'Go', bytes: 100, percentage: 10 },
      ],
    });

    expect(fetchContributions).toHaveBeenCalledWith(unusedClient, 'octocat', {
      from: '2025-08-30',
      to: '2026-08-29',
    });
  });

  it('keeps incomplete code changes as complete: false', async () => {
    await expect(
      fetchProfileStats(unusedClient, 'octocat', {
        today: '2026-08-29',
        fetchProfile: resolved(profile),
        fetchRepositories: resolved(repositories),
        fetchContributions: resolved([]),
        fetchLanguages: resolved([]),
        fetchCodeChanges: resolved({
          additions: 80,
          deletions: 20,
          total: 100,
          complete: false,
          repositoriesProcessed: 1,
          repositoriesSkipped: 1,
        }),
      }),
    ).resolves.toMatchObject({
      codeChanges: {
        additions: 80,
        deletions: 20,
        total: 100,
        complete: false,
      },
    });
  });

  it('returns empty languages, zero repos, and zero streak for an empty profile', async () => {
    await expect(
      fetchProfileStats(unusedClient, 'octocat', {
        today: '2026-08-29',
        fetchProfile: resolved({ ...profile, publicRepos: 0 }),
        fetchRepositories: resolved([]),
        fetchContributions: resolved([
          { date: '2026-08-28', count: 0 },
          { date: '2026-08-29', count: 0 },
        ]),
        fetchLanguages: resolved([]),
        fetchCodeChanges: resolved({
          additions: 0,
          deletions: 0,
          total: 0,
          complete: true,
          repositoriesProcessed: 0,
          repositoriesSkipped: 0,
        }),
      }),
    ).resolves.toEqual({
      username: 'octocat',
      repos: 0,
      stars: 0,
      currentStreak: 0,
      codeChanges: {
        additions: 0,
        deletions: 0,
        total: 0,
        complete: true,
      },
      topLanguages: [],
    });
  });

  it('uses the provided today for streak when today has no contributions yet', async () => {
    await expect(
      fetchProfileStats(unusedClient, 'octocat', {
        today: '2026-08-29',
        fetchProfile: resolved(profile),
        fetchRepositories: resolved([]),
        fetchContributions: resolved([
          { date: '2026-08-27', count: 1 },
          { date: '2026-08-28', count: 1 },
          { date: '2026-08-29', count: 0 },
        ]),
        fetchLanguages: resolved([]),
        fetchCodeChanges: resolved({
          additions: 0,
          deletions: 0,
          total: 0,
          complete: true,
          repositoriesProcessed: 0,
          repositoriesSkipped: 0,
        }),
      }),
    ).resolves.toMatchObject({
      currentStreak: 2,
    });
  });

  it('wraps a critical profile error without dropping the cause', async () => {
    const apiError = Object.assign(new Error('Not Found'), { status: 404 });

    await expect(
      fetchProfileStats(unusedClient, 'missing', {
        today: '2026-08-29',
        fetchProfile: () => Promise.reject(apiError),
      }),
    ).rejects.toMatchObject({
      name: 'ExpectedError',
      message: 'Unable to fetch GitHub profile data: user not found.',
      cause: apiError,
    });
  });

  it('limits top languages to 3', async () => {
    await expect(
      fetchProfileStats(unusedClient, 'octocat', {
        today: '2026-08-29',
        fetchProfile: resolved(profile),
        fetchRepositories: resolved(repositories),
        fetchContributions: resolved([]),
        fetchLanguages: resolved([
          {
            TypeScript: 400,
            Rust: 300,
            Go: 200,
            Shell: 100,
          },
        ]),
        fetchCodeChanges: resolved({
          additions: 0,
          deletions: 0,
          total: 0,
          complete: true,
          repositoriesProcessed: 2,
          repositoriesSkipped: 0,
        }),
      }),
    ).resolves.toMatchObject({
      topLanguages: [
        { name: 'TypeScript', percentage: 40 },
        { name: 'Rust', percentage: 30 },
        { name: 'Go', percentage: 20 },
      ],
    });
  });
});
