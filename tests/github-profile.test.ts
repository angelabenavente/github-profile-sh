import { describe, expect, it, vi } from 'vitest';

import {
  fetchGitHubProfile,
  type GitHubClient,
} from '../packages/core/src/github/index.js';

const publicUser = {
  login: 'octocat',
  name: 'The Octocat',
  bio: 'GitHub mascot',
  public_repos: 8,
  followers: 4000,
  following: 9,
  created_at: '2011-01-25T18:44:36Z',
  html_url: 'https://github.com/octocat',
};

function createFakeClient(
  getByUsername: (params: { username: string }) => Promise<{
    data: typeof publicUser;
  }>,
) {
  return {
    rest: {
      users: {
        getByUsername,
      },
    },
  };
}

describe('fetchGitHubProfile', () => {
  it('maps a public user response to GitHubProfile', async () => {
    const getByUsername = vi.fn().mockResolvedValue({ data: publicUser });

    await expect(
      fetchGitHubProfile(createFakeClient(getByUsername), 'octocat'),
    ).resolves.toEqual({
      username: 'octocat',
      name: 'The Octocat',
      bio: 'GitHub mascot',
      publicRepos: 8,
      followers: 4000,
      following: 9,
      createdAt: '2011-01-25T18:44:36Z',
      profileUrl: 'https://github.com/octocat',
    });

    expect(getByUsername).toHaveBeenCalledWith({ username: 'octocat' });
  });

  it('uses the canonical username from GitHub', async () => {
    const getByUsername = vi.fn().mockResolvedValue({
      data: {
        ...publicUser,
        login: 'Octocat',
      },
    });

    await expect(
      fetchGitHubProfile(createFakeClient(getByUsername), 'OCTOCAT'),
    ).resolves.toMatchObject({
      username: 'Octocat',
    });

    expect(getByUsername).toHaveBeenCalledWith({ username: 'OCTOCAT' });
  });

  it('maps public_repos to publicRepos', async () => {
    const getByUsername = vi.fn().mockResolvedValue({
      data: {
        ...publicUser,
        public_repos: 42,
      },
    });

    await expect(
      fetchGitHubProfile(createFakeClient(getByUsername), 'octocat'),
    ).resolves.toMatchObject({
      publicRepos: 42,
    });
  });

  it('keeps null name and bio', async () => {
    const getByUsername = vi.fn().mockResolvedValue({
      data: {
        ...publicUser,
        name: null,
        bio: null,
      },
    });

    await expect(
      fetchGitHubProfile(createFakeClient(getByUsername), 'octocat'),
    ).resolves.toMatchObject({
      name: null,
      bio: null,
    });
  });

  it.each(['', '   ', '\n'])(
    'rejects an empty username %j',
    async (username) => {
      const getByUsername = vi.fn();

      await expect(
        fetchGitHubProfile(createFakeClient(getByUsername), username),
      ).rejects.toThrowError(
        'Invalid GitHub username: expected a non-empty string',
      );

      expect(getByUsername).not.toHaveBeenCalled();
    },
  );

  it('propagates API errors from the client', async () => {
    const apiError = new Error('Not Found');
    const getByUsername = vi.fn().mockRejectedValue(apiError);

    await expect(
      fetchGitHubProfile(createFakeClient(getByUsername), 'missing-user'),
    ).rejects.toBe(apiError);
  });

  it('accepts the project GitHub client type', () => {
    const fetchFromClient: (
      client: GitHubClient,
      username: string,
    ) => ReturnType<typeof fetchGitHubProfile> = fetchGitHubProfile;

    expect(fetchFromClient).toBe(fetchGitHubProfile);
  });
});
