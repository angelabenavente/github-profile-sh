import type { FetchCodeChangesOptions } from './code-changes.js';
import { fetchRepositoriesCodeChanges } from './code-changes.js';
import {
  contributionCalendarRange,
  fetchContributionCalendar,
} from './calendar.js';
import { fetchGitHubProfile } from './profile.js';
import {
  calculateTotalStars,
  fetchPublicRepositories,
} from './repositories.js';
import {
  calculateTopLanguages,
  fetchRepositoriesLanguages,
} from './languages.js';
import { calculateCurrentStreak } from './streak.js';
import type {
  CodeChanges,
  ContributionDay,
  GitHubClient,
  GitHubProfile,
  ProfileStats,
  PublicRepository,
  RepositoryLanguages,
} from './types.js';

export type FetchProfileStatsOptions = {
  today: string;
  sleep?: FetchCodeChangesOptions['sleep'];
  retryDelayMs?: FetchCodeChangesOptions['retryDelayMs'];
  maxRetries?: FetchCodeChangesOptions['maxRetries'];
  fetchProfile?: (
    client: GitHubClient,
    username: string,
  ) => Promise<GitHubProfile>;
  fetchRepositories?: (
    client: GitHubClient,
    username: string,
  ) => Promise<PublicRepository[]>;
  fetchContributions?: (
    client: GitHubClient,
    username: string,
    range: { from: string; to: string },
  ) => Promise<ContributionDay[]>;
  fetchLanguages?: (
    client: GitHubClient,
    repositories: readonly Pick<PublicRepository, 'fullName'>[],
  ) => Promise<RepositoryLanguages[]>;
  fetchCodeChanges?: (
    client: GitHubClient,
    repositories: readonly Pick<PublicRepository, 'fullName'>[],
    username: string,
    options?: FetchCodeChangesOptions,
  ) => Promise<CodeChanges>;
};

function toProfileCodeChanges(
  codeChanges: CodeChanges,
): ProfileStats['codeChanges'] {
  return {
    additions: codeChanges.additions,
    deletions: codeChanges.deletions,
    total: codeChanges.total,
    complete: codeChanges.complete,
  };
}

export async function fetchProfileStats(
  client: GitHubClient,
  username: string,
  options: FetchProfileStatsOptions,
): Promise<ProfileStats> {
  const fetchProfile = options.fetchProfile ?? fetchGitHubProfile;
  const fetchRepositories =
    options.fetchRepositories ?? fetchPublicRepositories;
  const fetchContributions =
    options.fetchContributions ?? fetchContributionCalendar;
  const fetchLanguages = options.fetchLanguages ?? fetchRepositoriesLanguages;
  const fetchCodeChanges =
    options.fetchCodeChanges ?? fetchRepositoriesCodeChanges;

  const profile = await fetchProfile(client, username);
  const range = contributionCalendarRange(options.today);

  const [repositories, contributions] = await Promise.all([
    fetchRepositories(client, profile.username),
    fetchContributions(client, profile.username, range),
  ]);

  const codeChangeOptions: FetchCodeChangesOptions = {
    sleep: options.sleep,
    retryDelayMs: options.retryDelayMs,
    maxRetries: options.maxRetries,
  };

  const [languageMaps, codeChanges] = await Promise.all([
    fetchLanguages(client, repositories),
    fetchCodeChanges(client, repositories, profile.username, codeChangeOptions),
  ]);

  return {
    username: profile.username,
    repos: repositories.length,
    stars: calculateTotalStars(repositories),
    currentStreak: calculateCurrentStreak(contributions, options.today),
    codeChanges: toProfileCodeChanges(codeChanges),
    topLanguages: calculateTopLanguages(languageMaps),
  };
}
