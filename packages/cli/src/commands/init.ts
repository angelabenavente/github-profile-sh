import type { ProfileConfig } from '@github-profile-sh/core/config/schema';

import {
  PROFILE_CONFIG_FILENAME,
  writeProfileConfig,
} from '../config/write.js';
import { promptForConfig } from '../wizard/prompt.js';
import { WORKFLOW_RELATIVE_PATH } from '../workflow/generate.js';
import { WORKFLOW_OVERWRITE_LABEL, writeWorkflow } from '../workflow/write.js';

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
  const workflowResult = await writeWorkflow(config.update.frequency, {
    cwd: options.cwd,
    confirmOverwrite: options.confirmOverwriteWorkflow,
  });

  process.stdout.write(
    [
      formatWriteLine(configResult.status, PROFILE_CONFIG_FILENAME),
      formatWriteLine(
        workflowResult.status,
        WORKFLOW_RELATIVE_PATH,
        WORKFLOW_OVERWRITE_LABEL,
      ),
      '',
      'Setup files created.',
      '',
    ].join('\n'),
  );
}

function formatWriteLine(
  status: 'created' | 'overwritten' | 'skipped',
  createdPath: string,
  existingLabel = createdPath,
): string {
  if (status === 'skipped') {
    return `✓ Kept existing ${existingLabel}`;
  }

  return `✓ Created ${createdPath}`;
}
