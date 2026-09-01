import { ExpectedError } from '../errors.js';

export function normalizeGitHubUsername(username: string): string {
  const normalized = username.trim();

  if (normalized === '') {
    throw new ExpectedError(
      'Invalid GitHub username: expected a non-empty string',
    );
  }

  return normalized;
}
