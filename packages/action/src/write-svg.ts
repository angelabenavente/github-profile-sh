import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { ExpectedError, getErrorMessage } from '@github-profile-sh/core/errors';

export async function writeSvgFile(
  absolutePath: string,
  svg: string,
  requestedPath: string,
): Promise<void> {
  try {
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, svg, { encoding: 'utf8' });
  } catch (error) {
    throw new ExpectedError(
      `Unable to write SVG to: ${requestedPath}: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}
