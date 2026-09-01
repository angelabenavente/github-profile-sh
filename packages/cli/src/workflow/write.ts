import { join } from 'node:path';

import type { UpdateFrequency } from './generate.js';
import { generateWorkflow, WORKFLOW_RELATIVE_PATH } from './generate.js';
import { writeGeneratedFile } from '../fs/write-generated.js';
import { promptOverwrite } from '../wizard/prompt.js';

export const WORKFLOW_OVERWRITE_LABEL = 'github-profile-sh workflow';

export type WriteWorkflowOptions = {
  cwd?: string;
  confirmOverwrite?: () => boolean | Promise<boolean>;
};

export type WriteWorkflowResult = {
  path: string;
  status: 'created' | 'overwritten' | 'skipped';
};

export async function writeWorkflow(
  frequency: UpdateFrequency,
  options: WriteWorkflowOptions = {},
): Promise<WriteWorkflowResult> {
  const cwd = options.cwd ?? process.cwd();
  const path = join(cwd, WORKFLOW_RELATIVE_PATH);
  const yaml = generateWorkflow(frequency);
  const status = await writeGeneratedFile(
    path,
    yaml,
    options.confirmOverwrite ??
      (() =>
        promptOverwrite(
          `${WORKFLOW_OVERWRITE_LABEL} already exists. Overwrite?`,
        )),
    WORKFLOW_RELATIVE_PATH,
  );

  return { path, status };
}
