import { describe, expect, it } from 'vitest';

import { createGitHubClient } from '../packages/core/src/github/index.js';

function userAgentOf(client: ReturnType<typeof createGitHubClient>): string {
  const userAgent = client.request.endpoint.DEFAULTS.headers['user-agent'];

  if (typeof userAgent !== 'string') {
    throw new Error('expected Octokit to expose a user-agent header');
  }

  return userAgent;
}

describe('createGitHubClient', () => {
  it('creates an unauthenticated client without a token', async () => {
    const client = createGitHubClient();

    expect(client.rest).toBeDefined();
    expect(client.graphql).toEqual(expect.any(Function));
    expect(await client.auth()).toEqual({ type: 'unauthenticated' });
  });

  it('authenticates when a token is provided', async () => {
    const token = 'ghp_test-token-not-for-github';
    const client = createGitHubClient({ token });

    expect(client.rest).toBeDefined();
    expect(client.graphql).toEqual(expect.any(Function));
    expect(await client.auth()).toMatchObject({ type: 'token', token });
  });

  it('treats an empty token as unauthenticated', async () => {
    const client = createGitHubClient({ token: '' });

    expect(await client.auth()).toEqual({ type: 'unauthenticated' });
  });

  it('sets the project user-agent', () => {
    expect(userAgentOf(createGitHubClient())).toMatch(/^github-profile-sh\b/);
  });

  it('does not expose the token on the returned instance', () => {
    const token = 'ghp_test-token-must-not-leak';
    const client = createGitHubClient({ token });

    expect(JSON.stringify(client)).not.toContain(token);
  });
});
