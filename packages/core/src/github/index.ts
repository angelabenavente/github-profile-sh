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
export type {
  ContributionDay,
  GitHubClient,
  GitHubClientOptions,
  GitHubProfile,
  LanguageStat,
  PublicRepository,
  RepositoryLanguages,
} from './types.js';
