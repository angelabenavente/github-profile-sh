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

export type PublicRepository = {
  name: string;
  fullName: string;
  stars: number;
  forks: number;
  language: string | null;
  isFork: boolean;
  archived: boolean;
  repoUrl: string;
};

export type ContributionDay = {
  date: string;
  count: number;
};
