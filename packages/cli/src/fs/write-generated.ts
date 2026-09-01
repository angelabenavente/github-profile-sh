import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  ExpectedError,
  getErrorMessage,
  isExpectedError,
} from '@github-profile-sh/core/errors';

export type GeneratedFileStatus = 'created' | 'overwritten' | 'skipped';

export async function writeGeneratedFile(
  path: string,
  content: string,
  confirmOverwrite: () => boolean | Promise<boolean>,
  label = path,
): Promise<GeneratedFileStatus> {
  try {
    const exists = await fileExists(path);

    if (exists) {
      if (!(await confirmOverwrite())) {
        return 'skipped';
      }

      await writeFile(path, content, { encoding: 'utf8' });
      return 'overwritten';
    }

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, { encoding: 'utf8' });
    return 'created';
  } catch (error) {
    if (
      isExpectedError(error) ||
      (error instanceof Error && error.name === 'SetupCancelledError')
    ) {
      throw error;
    }

    throw new ExpectedError(
      `Unable to write ${label}: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
