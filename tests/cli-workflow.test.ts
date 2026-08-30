import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { runInit } from '../packages/cli/src/commands/init.js';
import { PROFILE_CONFIG_FILENAME } from '../packages/cli/src/config/write.js';
import { GITHUB_PROFILE_ACTION } from '../packages/cli/src/workflow/action-ref.js';
import {
  generateWorkflow,
  PROFILE_COMMIT_MESSAGE,
  PROFILE_SVG_FILENAME,
  WORKFLOW_RELATIVE_PATH,
  workflowCronByFrequency,
} from '../packages/cli/src/workflow/generate.js';
import { writeWorkflow } from '../packages/cli/src/workflow/write.js';
import {
  buildProfileConfig,
  defaultWizardAnswers,
} from '../packages/cli/src/wizard/config.js';
import { SetupCancelledError } from '../packages/cli/src/wizard/prompt.js';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'github-profile-sh-'));
}

const defaultConfig = buildProfileConfig(defaultWizardAnswers);

describe('generateWorkflow', () => {
  it.each([
    ['12h', '0 */12 * * *'],
    ['daily', '0 3 * * *'],
    ['weekly', '0 3 * * 1'],
    ['monthly', '0 3 1 * *'],
  ] as const)('maps %s to %s', (frequency, cron) => {
    const yaml = generateWorkflow(frequency);

    expect(workflowCronByFrequency[frequency]).toBe(cron);
    expect(yaml).toContain('on:');
    expect(yaml).not.toMatch(/^["']on["']:/m);
    expect(yaml).not.toMatch(/^true:/m);
    expect(yaml).toContain('workflow_dispatch:');
    expect(yaml).toContain('schedule:');
    expect(yaml).toContain(`cron: "${cron}"`);
    expect(yaml).toContain('contents: write');
    expect(yaml).toContain('actions/checkout@v6');
    expect(yaml).toContain('Generate profile');
    expect(yaml).toContain(`uses: ${GITHUB_PROFILE_ACTION}`);
    expect(yaml).toContain(`output: ${PROFILE_SVG_FILENAME}`);
    expect(yaml).toContain('token: ${{ github.token }}');
    expect(yaml).toContain(`git commit -m "${PROFILE_COMMIT_MESSAGE}"`);
    expect(yaml).toBe(generateWorkflow(frequency));
  });

  it('omits schedule for manual updates', () => {
    const yaml = generateWorkflow('manual');

    expect(yaml).toContain('on:');
    expect(yaml).toContain('workflow_dispatch:');
    expect(yaml).not.toContain('schedule:');
    expect(yaml).not.toContain('cron:');
    expect(yaml).toContain('contents: write');
    expect(yaml).toContain(`output: ${PROFILE_SVG_FILENAME}`);
    expect(yaml).toContain('token: ${{ github.token }}');
    expect(yaml).toContain(`git commit -m "${PROFILE_COMMIT_MESSAGE}"`);
    expect(yaml).toBe(generateWorkflow('manual'));
  });
});

describe('writeWorkflow', () => {
  it('creates .github/workflows/github-profile-sh.yml', async () => {
    const cwd = tempDir();
    const result = await writeWorkflow('daily', { cwd });

    expect(result.status).toBe('created');
    expect(result.path).toBe(join(cwd, WORKFLOW_RELATIVE_PATH));
    expect(readdirSync(join(cwd, '.github'))).toEqual(['workflows']);
    expect(readdirSync(join(cwd, '.github/workflows'))).toEqual([
      'github-profile-sh.yml',
    ]);
    expect(readFileSync(result.path, 'utf8')).toBe(generateWorkflow('daily'));
  });

  it('overwrites when the user confirms yes', async () => {
    const cwd = tempDir();
    const path = join(cwd, WORKFLOW_RELATIVE_PATH);
    mkdirSync(join(cwd, '.github/workflows'), { recursive: true });
    writeFileSync(path, 'name: leftover\n', 'utf8');

    const result = await writeWorkflow('weekly', {
      cwd,
      confirmOverwrite: () => true,
    });

    expect(result.status).toBe('overwritten');
    expect(readFileSync(path, 'utf8')).toBe(generateWorkflow('weekly'));
  });

  it('keeps the existing workflow when overwrite is no', async () => {
    const cwd = tempDir();
    const path = join(cwd, WORKFLOW_RELATIVE_PATH);
    mkdirSync(join(cwd, '.github/workflows'), { recursive: true });
    writeFileSync(path, 'name: leftover\n', 'utf8');

    const result = await writeWorkflow('daily', {
      cwd,
      confirmOverwrite: () => false,
    });

    expect(result.status).toBe('skipped');
    expect(readFileSync(path, 'utf8')).toBe('name: leftover\n');
  });

  it('does not modify the workflow when overwrite is cancelled', async () => {
    const cwd = tempDir();
    const path = join(cwd, WORKFLOW_RELATIVE_PATH);
    mkdirSync(join(cwd, '.github/workflows'), { recursive: true });
    writeFileSync(path, 'name: leftover\n', 'utf8');

    await expect(
      writeWorkflow('daily', {
        cwd,
        confirmOverwrite: () => {
          throw new SetupCancelledError();
        },
      }),
    ).rejects.toBeInstanceOf(SetupCancelledError);
    expect(readFileSync(path, 'utf8')).toBe('name: leftover\n');
  });

  it('does not write outside the given cwd', async () => {
    const parent = tempDir();
    const cwd = join(parent, 'project');
    mkdirSync(cwd);
    writeFileSync(join(parent, 'keep-me.txt'), 'ok\n', 'utf8');

    await writeWorkflow('manual', { cwd });

    expect(readdirSync(parent).sort()).toEqual(['keep-me.txt', 'project']);
    expect(readdirSync(cwd)).toEqual(['.github']);
  });
});

describe('runInit workflow files', () => {
  it('creates config and workflow together', async () => {
    const cwd = tempDir();
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    try {
      await runInit({
        collectConfig: () => defaultConfig,
        cwd,
      });
      const output = write.mock.calls.map(([chunk]) => String(chunk)).join('');
      expect(output).toContain('✓ Created github-profile-sh.yml');
      expect(output).toContain(
        '✓ Created .github/workflows/github-profile-sh.yml',
      );
      expect(output).toContain('Setup complete.');
    } finally {
      write.mockRestore();
    }

    expect(readdirSync(cwd).sort()).toEqual([
      '.github',
      PROFILE_CONFIG_FILENAME,
    ]);
    expect(readdirSync(join(cwd, '.github/workflows'))).toEqual([
      'github-profile-sh.yml',
    ]);
    expect(readdirSync(cwd)).not.toContain('README.md');
    expect(readdirSync(cwd)).not.toContain('action.yml');
    expect(readFileSync(join(cwd, WORKFLOW_RELATIVE_PATH), 'utf8')).toBe(
      generateWorkflow('daily'),
    );
  });

  it('can keep an existing config and still create the workflow', async () => {
    const cwd = tempDir();
    const configPath = join(cwd, PROFILE_CONFIG_FILENAME);
    writeFileSync(configPath, 'theme: leftover\n', 'utf8');

    await runInit({
      collectConfig: () => defaultConfig,
      confirmOverwriteConfig: () => false,
      cwd,
    });

    expect(readFileSync(configPath, 'utf8')).toBe('theme: leftover\n');
    expect(readFileSync(join(cwd, WORKFLOW_RELATIVE_PATH), 'utf8')).toBe(
      generateWorkflow('daily'),
    );
  });
});
