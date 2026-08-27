export { createGitHubClient } from './client.js';
export { fetchGitHubProfile } from './profile.js';
export {
  calculateTotalStars,
  fetchPublicRepositories,
} from './repositories.js';
export type {
  GitHubClient,
  GitHubClientOptions,
  GitHubProfile,
  PublicRepository,
} from './types.js';
