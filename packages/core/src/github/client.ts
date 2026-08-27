import { Octokit } from 'octokit';

import type { GitHubClient, GitHubClientOptions } from './types.js';

const userAgent = 'github-profile-sh';

export function createGitHubClient(
  options: GitHubClientOptions = {},
): GitHubClient {
  const token = options.token;

  return new Octokit({
    userAgent,
    ...(token ? { auth: token } : {}),
  });
}
