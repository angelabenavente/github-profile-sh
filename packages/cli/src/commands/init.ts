import type { ProfileConfig } from '@github-profile-sh/core/config/schema';

import {
  PROFILE_CONFIG_FILENAME,
  writeProfileConfig,
} from '../config/write.js';
import { promptForConfig } from '../wizard/prompt.js';
import { writeWorkflow } from '../workflow/write.js';

import { buildSetupSummary, formatGeneratedFileLine } from './setup-summary.js';

export type RunInitOptions = {
  collectConfig?: () => ProfileConfig | Promise<ProfileConfig>;
  confirmOverwriteConfig?: () => boolean | Promise<boolean>;
  confirmOverwriteWorkflow?: () => boolean | Promise<boolean>;
  cwd?: string;
};

export async function runInit(options: RunInitOptions = {}): Promise<void> {
  const config = await (options.collectConfig ?? promptForConfig)();
  const configResult = await writeProfileConfig(config, {
    cwd: options.cwd,
    confirmOverwrite: options.confirmOverwriteConfig,
  });

  try {
    const workflowResult = await writeWorkflow(config.update.frequency, {
      cwd: options.cwd,
      confirmOverwrite: options.confirmOverwriteWorkflow,
    });

    process.stdout.write(
      buildSetupSummary({
        configStatus: configResult.status,
        workflowStatus: workflowResult.status,
        frequency: config.update.frequency,
      }),
    );
  } catch (error) {
    process.stdout.write(
      `${formatGeneratedFileLine(configResult.status, PROFILE_CONFIG_FILENAME)}\n`,
    );
    throw error;
  }
}
