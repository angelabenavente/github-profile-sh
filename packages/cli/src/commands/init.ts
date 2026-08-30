import type { ProfileConfig } from '@github-profile-sh/core/config/schema';

import { formatSummary } from '../wizard/config.js';
import { promptForConfig } from '../wizard/prompt.js';

export async function runInit(
  collectConfig: () => ProfileConfig | Promise<ProfileConfig> = promptForConfig,
): Promise<void> {
  const config = await collectConfig();
  process.stdout.write(`${formatSummary(config)}\n`);
}
