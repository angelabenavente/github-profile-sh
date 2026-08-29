export { createGitHubClient } from './client.js';
export { fetchGitHubProfile } from './profile.js';
export {
  calculateTotalStars,
  fetchPublicRepositories,
} from './repositories.js';
export { calculateCurrentStreak } from './streak.js';
export {
  aggregateLanguages,
  calculateTopLanguages,
  fetchRepositoriesLanguages,
  fetchRepositoryLanguages,
} from './languages.js';
export {
  calculateCodeChanges,
  fetchRepositoriesCodeChanges,
  fetchRepositoryCodeChanges,
} from './code-changes.js';
export type { FetchCodeChangesOptions } from './code-changes.js';
export type {
  CodeChanges,
  ContributionDay,
  GitHubClient,
  GitHubClientOptions,
  GitHubProfile,
  LanguageStat,
  PublicRepository,
  RepositoryCodeChanges,
  RepositoryLanguages,
} from './types.js';
