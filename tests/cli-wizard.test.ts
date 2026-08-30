import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { run } from '../packages/cli/src/cli.js';
import { runInit } from '../packages/cli/src/commands/init.js';
import {
  buildProfileConfig,
  defaultWizardAnswers,
  formatSummary,
  InvalidWizardAnswersError,
} from '../packages/cli/src/wizard/config.js';
import {
  collectWizardAnswers,
  NonInteractiveError,
  SetupCancelledError,
} from '../packages/cli/src/wizard/prompt.js';
import {
  defaultProfileConfig,
  profileConfigSchema,
} from '../packages/core/src/config/index.js';

describe('wizard ProfileConfig', () => {
  it('builds the core defaults from the wizard defaults', () => {
    const config = buildProfileConfig(defaultWizardAnswers);

    expect(config).toEqual(defaultProfileConfig);
    expect(config.theme).toBe('dark');
    expect(config.sections).toEqual({
      repos: true,
      stars: true,
      streak: true,
      codeChanges: true,
      languages: true,
    });
    expect(config.animation).toEqual({ enabled: true, mode: 'typing' });
    expect(config.update.frequency).toBe('daily');
    expect(profileConfigSchema.parse(config)).toEqual(config);
  });

  it('can disable some metrics', () => {
    const config = buildProfileConfig({
      ...defaultWizardAnswers,
      sections: ['repos', 'stars', 'languages'],
    });

    expect(config.sections).toEqual({
      repos: true,
      stars: true,
      streak: false,
      codeChanges: false,
      languages: true,
    });
  });

  it('rejects an empty metrics selection', () => {
    expect(() =>
      buildProfileConfig({
        ...defaultWizardAnswers,
        sections: [],
      }),
    ).toThrow(InvalidWizardAnswersError);
  });

  it.each([
    ['typing', { enabled: true, mode: 'typing' as const }],
    ['sequential', { enabled: true, mode: 'sequential' as const }],
    ['none', { enabled: false, mode: 'none' as const }],
  ] as const)('maps %s animation', (animation, expected) => {
    expect(
      buildProfileConfig({
        ...defaultWizardAnswers,
        animation,
      }).animation,
    ).toEqual(expected);
  });

  it.each([
    ['12h', '12h'],
    ['daily', 'daily'],
    ['weekly', 'weekly'],
    ['monthly', 'monthly'],
    ['manual', 'manual'],
  ] as const)('maps %s update frequency', (frequency, expected) => {
    expect(
      buildProfileConfig({
        ...defaultWizardAnswers,
        frequency,
      }).update.frequency,
    ).toBe(expected);
  });

  it('summarizes the selected configuration', () => {
    const summary = formatSummary(
      buildProfileConfig({
        sections: ['repos', 'stars', 'streak', 'languages'],
        animation: 'typing',
        frequency: 'daily',
      }),
    );

    expect(summary).toContain('Configuration ready.');
    expect(summary).toContain('repos');
    expect(summary).toContain('current streak');
    expect(summary).toContain('top languages');
    expect(summary).not.toContain('code changes');
    expect(summary).toContain('typing');
    expect(summary).toContain('once a day');
  });
});

describe('collectWizardAnswers', () => {
  it('does not start an interactive session without a TTY', async () => {
    await expect(collectWizardAnswers()).rejects.toBeInstanceOf(
      NonInteractiveError,
    );
  });
});

describe('runInit', () => {
  it('prints a summary and does not write files', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'github-profile-sh-'));
    const previousCwd = process.cwd();
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    try {
      process.chdir(directory);
      await runInit(() => buildProfileConfig(defaultWizardAnswers));
      expect(
        write.mock.calls.map(([chunk]) => String(chunk)).join(''),
      ).toContain('Configuration ready.');
      expect(readdirSync(directory)).toEqual([]);
    } finally {
      process.chdir(previousCwd);
      write.mockRestore();
    }
  });

  it('propagates cancellation without writing files', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'github-profile-sh-'));
    const previousCwd = process.cwd();

    try {
      process.chdir(directory);
      await expect(
        runInit(() => {
          throw new SetupCancelledError();
        }),
      ).rejects.toBeInstanceOf(SetupCancelledError);
    } finally {
      process.chdir(previousCwd);
    }

    expect(readdirSync(directory)).toEqual([]);
  });

  it('prints a short cancel message and exits without crashing', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    try {
      const code = await run(['node', 'github-profile-sh', 'init'], () => {
        throw new SetupCancelledError();
      });
      expect(code).toBe(1);
      expect(write.mock.calls.map(([chunk]) => String(chunk)).join('')).toBe(
        'Setup cancelled.\n',
      );
    } finally {
      write.mockRestore();
    }
  });
});
