export { createGitHubClient } from './client.js';
export { fetchGitHubProfile } from './profile.js';
export {
  calculateTotalStars,
  fetchPublicRepositories,
} from './repositories.js';
export { calculateCurrentStreak } from './streak.js';
export type {
  ContributionDay,
  GitHubClient,
  GitHubClientOptions,
  GitHubProfile,
  PublicRepository,
} from './types.js';
