import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { run } from '../packages/cli/src/cli.js';
import { runInit } from '../packages/cli/src/commands/init.js';
import {
  buildSetupSummary,
  profileReadmeSnippet,
} from '../packages/cli/src/commands/setup-summary.js';
import {
  buildProfileConfig,
  defaultWizardAnswers,
} from '../packages/cli/src/wizard/config.js';
import { frequencyLabel } from '../packages/cli/src/wizard/options.js';
import { SetupCancelledError } from '../packages/cli/src/wizard/prompt.js';
import { PROFILE_SVG_FILENAME } from '../packages/cli/src/workflow/generate.js';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'github-profile-sh-setup-'));
}

const defaultConfig = buildProfileConfig(defaultWizardAnswers);
const manualConfig = buildProfileConfig({
  ...defaultWizardAnswers,
  frequency: 'manual',
});

describe('profileReadmeSnippet', () => {
  it('uses the workflow SVG path', () => {
    expect(profileReadmeSnippet()).toBe(
      `![github-profile.sh](./${PROFILE_SVG_FILENAME})`,
    );
    expect(profileReadmeSnippet()).toBe(
      '![github-profile.sh](./github-profile.svg)',
    );
  });
});

describe('frequencyLabel', () => {
  it('uses the wizard names', () => {
    expect(frequencyLabel('daily')).toBe('Once a day');
    expect(frequencyLabel('manual')).toBe('Manual only');
    expect(frequencyLabel('12h')).toBe('Every 12 hours');
  });
});

describe('buildSetupSummary', () => {
  it('describes a successful setup without cron', () => {
    const summary = buildSetupSummary({
      configStatus: 'created',
      workflowStatus: 'created',
      frequency: 'daily',
    });

    expect(summary).toContain('Setup complete.');
    expect(summary).toContain('✓ Created github-profile-sh.yml');
    expect(summary).toContain(
      '✓ Created .github/workflows/github-profile-sh.yml',
    );
    expect(summary).toContain('Once a day');
    expect(summary).toContain(profileReadmeSnippet());
    expect(summary).not.toContain('0 3 * * *');
    expect(summary).not.toContain('cron');
  });

  it('does not announce a kept file as created', () => {
    const summary = buildSetupSummary({
      configStatus: 'skipped',
      workflowStatus: 'created',
      frequency: 'manual',
    });

    expect(summary).toContain('✓ Kept existing github-profile-sh.yml');
    expect(summary).not.toMatch(/✓ Created github-profile-sh.yml$/m);
    expect(summary).toContain('Manual only');
  });

  it('distinguishes overwritten files', () => {
    const summary = buildSetupSummary({
      configStatus: 'overwritten',
      workflowStatus: 'overwritten',
      frequency: 'daily',
    });

    expect(summary).toContain('✓ Overwritten github-profile-sh.yml');
    expect(summary).toContain(
      '✓ Overwritten .github/workflows/github-profile-sh.yml',
    );
    expect(summary).not.toContain('✓ Created github-profile-sh.yml');
  });
});

describe('runInit setup summary', () => {
  it('prints the README snippet and does not modify README.md', async () => {
    const cwd = tempDir();
    const readmePath = join(cwd, 'README.md');
    writeFileSync(readmePath, '# My profile\n', 'utf8');
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    let output: string;
    try {
      await runInit({
        collectConfig: () => defaultConfig,
        cwd,
      });
      output = write.mock.calls.map(([chunk]) => String(chunk)).join('');
    } finally {
      write.mockRestore();
    }

    expect(output).toContain('Setup complete.');
    expect(output).toContain('✓ Created github-profile-sh.yml');
    expect(output).toContain(
      '✓ Created .github/workflows/github-profile-sh.yml',
    );
    expect(output).toContain('Once a day');
    expect(output).toContain(profileReadmeSnippet());
    expect(output).not.toContain('cron');
    expect(readFileSync(readmePath, 'utf8')).toBe('# My profile\n');
  });

  it('shows Manual only when that frequency is selected', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    let output: string;
    try {
      await runInit({
        collectConfig: () => manualConfig,
        cwd: tempDir(),
      });
      output = write.mock.calls.map(([chunk]) => String(chunk)).join('');
    } finally {
      write.mockRestore();
    }

    expect(output).toContain('Manual only');
  });

  it('does not show Setup complete when cancelled', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    let output: string;
    try {
      const code = await run(['node', 'github-profile-sh', 'init'], () => {
        throw new SetupCancelledError();
      });
      expect(code).toBe(1);
      output = write.mock.calls.map(([chunk]) => String(chunk)).join('');
    } finally {
      write.mockRestore();
    }

    expect(output).toBe('Setup cancelled.\n');
    expect(output).not.toContain('Setup complete.');
    expect(output).not.toContain(profileReadmeSnippet());
  });
});

describe('init source', () => {
  it('does not run git commands', () => {
    const init = readFileSync(
      new URL('../packages/cli/src/commands/init.ts', import.meta.url),
      'utf8',
    );
    const summary = readFileSync(
      new URL('../packages/cli/src/commands/setup-summary.ts', import.meta.url),
      'utf8',
    );
    const source = `${init}\n${summary}`;

    expect(source).not.toContain('git add');
    expect(source).not.toContain('git commit');
    expect(source).not.toContain('git push');
    expect(source).not.toContain('execFile');
    expect(source).not.toContain('spawn');
  });
});
