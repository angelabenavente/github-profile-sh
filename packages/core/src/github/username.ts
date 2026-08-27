export function normalizeGitHubUsername(username: string): string {
  const normalized = username.trim();

  if (normalized === '') {
    throw new Error('Invalid GitHub username: expected a non-empty string');
  }

  return normalized;
}
