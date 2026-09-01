import {
  ExpectedError,
  getErrorMessage,
  getErrorStatus,
  isExpectedError,
} from '../errors.js';

export function wrapGitHubError(error: unknown): ExpectedError {
  if (isExpectedError(error)) {
    return error;
  }

  const status = getErrorStatus(error);
  const message = getErrorMessage(error);

  if (isRateLimitError(error, status, message)) {
    return new ExpectedError(
      'GitHub API rate limit reached. Try again later.',
      { cause: error },
    );
  }

  if (status === 404 || /^GitHub user not found:/.test(message)) {
    return new ExpectedError(
      message.startsWith('GitHub user not found:')
        ? message
        : 'Unable to fetch GitHub profile data: user not found.',
      { cause: error },
    );
  }

  if (status != null) {
    return new ExpectedError(`GitHub API request failed (${status}).`, {
      cause: error,
    });
  }

  if (isGraphqlError(error, message)) {
    return new ExpectedError(`GitHub GraphQL request failed: ${message}`, {
      cause: error,
    });
  }

  return new ExpectedError(`Unable to fetch GitHub profile data: ${message}`, {
    cause: error,
  });
}

function isRateLimitError(
  error: unknown,
  status: number | undefined,
  message: string,
): boolean {
  if (status === 429) {
    return true;
  }

  if (/rate limit/i.test(message)) {
    return true;
  }

  return status === 403 && /secondary rate|abuse detection/i.test(message);
}

function isGraphqlError(error: unknown, message: string): boolean {
  if (/graphql/i.test(message)) {
    return true;
  }

  return (
    error instanceof Error &&
    (error.name === 'GraphqlResponseError' || error.name === 'GraphqlError')
  );
}
