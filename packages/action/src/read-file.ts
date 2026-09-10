import { readFile } from 'node:fs/promises';

import { ExpectedError, getErrorMessage } from '@github-profile-sh/core/errors';

export async function readTextFile(
  absolutePath: string,
  requestedPath: string,
  options: {
    missingPrefix: string;
    readPrefix: string;
  },
): Promise<string> {
  try {
    return await readFile(absolutePath, { encoding: 'utf8' });
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new ExpectedError(`${options.missingPrefix}: ${requestedPath}`, {
        cause: error,
      });
    }

    throw new ExpectedError(
      `${options.readPrefix}: ${requestedPath}: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
