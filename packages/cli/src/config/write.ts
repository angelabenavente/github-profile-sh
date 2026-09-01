import { join } from 'node:path';

import type { ProfileConfig } from '@github-profile-sh/core/config/schema';
import { profileConfigSchema } from '@github-profile-sh/core/config/schema';
import { serializeProfileConfig } from '@github-profile-sh/core/config/serialize';
import { ExpectedError, getErrorMessage } from '@github-profile-sh/core/errors';

import { writeGeneratedFile } from '../fs/write-generated.js';
import { promptOverwrite } from '../wizard/prompt.js';

export const PROFILE_CONFIG_FILENAME = 'github-profile-sh.yml';

export type WriteProfileConfigOptions = {
  cwd?: string;
  confirmOverwrite?: () => boolean | Promise<boolean>;
};

export type WriteProfileConfigResult = {
  path: string;
  status: 'created' | 'overwritten' | 'skipped';
};

export async function writeProfileConfig(
  config: ProfileConfig,
  options: WriteProfileConfigOptions = {},
): Promise<WriteProfileConfigResult> {
  const cwd = options.cwd ?? process.cwd();
  const path = join(cwd, PROFILE_CONFIG_FILENAME);
  let yaml: string;

  try {
    yaml = serializeProfileConfig(profileConfigSchema.parse(config));
  } catch (error) {
    throw new ExpectedError(
      `Invalid configuration: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }

  const status = await writeGeneratedFile(
    path,
    yaml,
    options.confirmOverwrite ??
      (() =>
        promptOverwrite(
          `${PROFILE_CONFIG_FILENAME} already exists. Overwrite?`,
        )),
    PROFILE_CONFIG_FILENAME,
  );

  return { path, status };
}
