import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ProfileConfig } from '@github-profile-sh/core/config/schema';
import { profileConfigSchema } from '@github-profile-sh/core/config/schema';
import { serializeProfileConfig } from '@github-profile-sh/core/config/serialize';

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
  const exists = await fileExists(path);

  if (exists) {
    const overwrite = await (
      options.confirmOverwrite ??
      (() => promptOverwrite(PROFILE_CONFIG_FILENAME))
    )();

    if (!overwrite) {
      return { path, status: 'skipped' };
    }

    await writeFile(path, yaml, { encoding: 'utf8' });
    return { path, status: 'overwritten' };
  }

  await writeFile(path, yaml, { encoding: 'utf8' });
  return { path, status: 'created' };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
