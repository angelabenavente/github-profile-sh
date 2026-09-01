export class ExpectedError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ExpectedError';
  }
}

export function isExpectedError(error: unknown): error is ExpectedError {
  return error instanceof ExpectedError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }

  if (typeof error === 'string' && error.trim() !== '') {
    return error;
  }

  return 'Unknown error';
}

export function getErrorStatus(error: unknown): number | undefined {
  if (error === null || typeof error !== 'object') {
    return undefined;
  }

  if ('status' in error && typeof error.status === 'number') {
    return error.status;
  }

  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  if (
    'response' in error &&
    error.response !== null &&
    typeof error.response === 'object' &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  ) {
    return error.response.status;
  }

  return undefined;
}
