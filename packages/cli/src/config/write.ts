import { join } from 'node:path';

import type { ProfileConfig } from '@github-profile-sh/core/config/schema';
import { profileConfigSchema } from '@github-profile-sh/core/config/schema';
import { serializeProfileConfig } from '@github-profile-sh/core/config/serialize';

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
  const yaml = serializeProfileConfig(profileConfigSchema.parse(config));
  const status = await writeGeneratedFile(
    path,
    yaml,
    options.confirmOverwrite ??
      (() =>
        promptOverwrite(
          `${PROFILE_CONFIG_FILENAME} already exists. Overwrite?`,
        )),
  );

  return { path, status };
}
