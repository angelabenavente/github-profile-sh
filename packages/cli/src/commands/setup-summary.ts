import type { ProfileConfig } from '@github-profile-sh/core/config/schema';
import type { GeneratedFileStatus } from '../fs/write-generated.js';

import { PROFILE_CONFIG_FILENAME } from '../config/write.js';
import { frequencyLabel } from '../wizard/options.js';
import {
  PROFILE_SVG_FILENAME,
  WORKFLOW_RELATIVE_PATH,
} from '../workflow/generate.js';

export function profileReadmeSnippet(
  filename: string = PROFILE_SVG_FILENAME,
): string {
  return `![github-profile.sh](./${filename})`;
}

export function buildSetupSummary(options: {
  configStatus: GeneratedFileStatus;
  workflowStatus: GeneratedFileStatus;
  frequency: ProfileConfig['update']['frequency'];
}): string {
  return [
    formatGeneratedFileLine(options.configStatus, PROFILE_CONFIG_FILENAME),
    formatGeneratedFileLine(options.workflowStatus, WORKFLOW_RELATIVE_PATH),
    '',
    'Setup complete.',
    '',
    'Update frequency',
    `  ${frequencyLabel(options.frequency)}`,
    '',
    'Add this to your GitHub profile README:',
    '',
    `  ${profileReadmeSnippet()}`,
    '',
    'Then commit and push these files.',
    'The profile will be generated the next time the workflow runs.',
    'You can run the workflow manually from the Actions tab.',
    '',
  ].join('\n');
}

export function formatGeneratedFileLine(
  status: GeneratedFileStatus,
  path: string,
): string {
  switch (status) {
    case 'created':
      return `✓ Created ${path}`;
    case 'overwritten':
      return `✓ Overwritten ${path}`;
    case 'skipped':
      return `✓ Kept existing ${path}`;
  }
}
