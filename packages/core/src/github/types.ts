import type { Octokit } from 'octokit';

export type GitHubClientOptions = {
  token?: string;
};

export type GitHubClient = Octokit;

export type GitHubProfile = {
  username: string;
  name: string | null;
  bio: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;
  profileUrl: string;
};
