import type { GitHubProfile } from './types.js';
import { normalizeGitHubUsername } from './username.js';

type GitHubProfileResponse = {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  html_url: string;
};

type GitHubProfileClient = {
  rest: {
    users: {
      getByUsername: (params: {
        username: string;
      }) => Promise<{ data: GitHubProfileResponse }>;
    };
  };
};

export async function fetchGitHubProfile(
  client: GitHubProfileClient,
  username: string,
): Promise<GitHubProfile> {
  const normalizedUsername = normalizeGitHubUsername(username);
  const { data } = await client.rest.users.getByUsername({
    username: normalizedUsername,
  });

  return {
    username: data.login,
    name: data.name,
    bio: data.bio,
    publicRepos: data.public_repos,
    followers: data.followers,
    following: data.following,
    createdAt: data.created_at,
    profileUrl: data.html_url,
  };
}
