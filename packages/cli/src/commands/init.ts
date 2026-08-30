import type { ProfileConfig } from '@github-profile-sh/core/config/schema';

import {
  PROFILE_CONFIG_FILENAME,
  writeProfileConfig,
} from '../config/write.js';
import { promptForConfig } from '../wizard/prompt.js';

export type RunInitOptions = {
  collectConfig?: () => ProfileConfig | Promise<ProfileConfig>;
  confirmOverwrite?: () => boolean | Promise<boolean>;
  cwd?: string;
};

export async function runInit(options: RunInitOptions = {}): Promise<void> {
  const config = await (options.collectConfig ?? promptForConfig)();
  const result = await writeProfileConfig(config, {
    cwd: options.cwd,
    confirmOverwrite: options.confirmOverwrite,
  });

  if (result.status === 'skipped') {
    process.stdout.write(`Kept existing ${PROFILE_CONFIG_FILENAME}\n`);
    return;
  }

  process.stdout.write(
    `Created ${PROFILE_CONFIG_FILENAME}\n\nConfiguration file created.\n`,
  );
}
