import type { Octokit } from 'octokit';

export type GitHubClientOptions = {
  token?: string;
};

export type GitHubClient = Octokit;
