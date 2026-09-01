import { describe, expect, it } from 'vitest';

import {
  ExpectedError,
  getErrorMessage,
  getErrorStatus,
  isExpectedError,
} from '../packages/core/src/errors.js';
import { wrapGitHubError } from '../packages/core/src/github/api-error.js';

describe('getErrorMessage', () => {
  it('reads Error messages and unknown values', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage('plain')).toBe('plain');
    expect(getErrorMessage(null)).toBe('Unknown error');
    expect(getErrorMessage({})).toBe('Unknown error');
  });
});

describe('getErrorStatus', () => {
  it('reads status from Octokit-like errors', () => {
    expect(
      getErrorStatus(Object.assign(new Error('no'), { status: 403 })),
    ).toBe(403);
    expect(
      getErrorStatus({ response: { status: 429 }, message: 'slow down' }),
    ).toBe(429);
    expect(getErrorStatus(new Error('no status'))).toBeUndefined();
  });
});

describe('wrapGitHubError', () => {
  it('keeps ExpectedError instances', () => {
    const error = new ExpectedError('already clean');
    expect(wrapGitHubError(error)).toBe(error);
    expect(isExpectedError(error)).toBe(true);
  });

  it('maps rate-limit-like errors', () => {
    expect(
      wrapGitHubError(
        Object.assign(new Error('API rate limit exceeded'), { status: 403 }),
      ).message,
    ).toBe('GitHub API rate limit reached. Try again later.');
    expect(
      wrapGitHubError(Object.assign(new Error('slow down'), { status: 429 }))
        .message,
    ).toBe('GitHub API rate limit reached. Try again later.');
  });

  it('keeps HTTP status without dumping headers', () => {
    const error = Object.assign(new Error('Forbidden'), {
      status: 403,
      response: {
        headers: {
          authorization: 'token ghs_should_not_appear',
          'x-ratelimit-remaining': '0',
        },
      },
    });
    const wrapped = wrapGitHubError(error);

    expect(wrapped.message).toBe('GitHub API request failed (403).');
    expect(wrapped.message).not.toContain('ghs_should_not_appear');
    expect(wrapped.message).not.toContain('authorization');
    expect(wrapped.cause).toBe(error);
  });

  it('maps GraphQL failures', () => {
    const error = Object.assign(new Error('Could not resolve to a User'), {
      name: 'GraphqlResponseError',
    });

    expect(wrapGitHubError(error).message).toBe(
      'GitHub GraphQL request failed: Could not resolve to a User',
    );
  });
});
