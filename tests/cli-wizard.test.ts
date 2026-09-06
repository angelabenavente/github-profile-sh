import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
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
  parseProfileConfig,
  profileConfigSchema,
  serializeProfileConfig,
} from '../packages/core/src/config/index.js';
import { renderTerminalSvg } from '../packages/core/src/renderer/index.js';
import {
  getTheme,
  themeIds,
  themeLabel,
  themeOptions,
} from '../packages/core/src/theme/index.js';
import { completeOutput } from './fixtures/terminal-output.js';

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

  it.each(themeIds)('maps theme %s through schema and YAML', (theme) => {
    const config = buildProfileConfig({
      ...defaultWizardAnswers,
      theme,
    });
    const yaml = serializeProfileConfig(config);

    expect(config.theme).toBe(theme);
    expect(profileConfigSchema.parse(config)).toEqual(config);
    expect(yaml).toMatch(new RegExp(`^theme: ${theme}$`, 'm'));
    expect(yaml).not.toContain(`theme: ${themeLabel(theme)}\n`);
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
        ...defaultWizardAnswers,
        sections: ['repos', 'stars', 'streak', 'languages'],
        theme: 'matrix',
        animation: 'typing',
        frequency: 'daily',
      }),
    );

    expect(summary).toContain('Configuration ready.');
    expect(summary).toContain('repos');
    expect(summary).toContain('current streak');
    expect(summary).toContain('top languages');
    expect(summary).not.toContain('code changes');
    expect(summary).toContain('Theme');
    expect(summary).toContain('Matrix');
    expect(summary).not.toMatch(/^ {2}matrix$/m);
    expect(summary).toContain('typing');
    expect(summary).toContain('once a day');
  });

  it('uses the shared theme options for the selector', () => {
    expect(themeOptions).toEqual([
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
      { value: 'github-dark', label: 'GitHub Dark' },
      { value: 'ubuntu', label: 'Ubuntu' },
      { value: 'macos', label: 'macOS' },
      { value: 'matrix', label: 'Matrix' },
      { value: 'dracula', label: 'Dracula' },
      { value: 'nord', label: 'Nord' },
      { value: 'tokyo-night', label: 'Tokyo Night' },
      { value: 'catppuccin', label: 'Catppuccin' },
      { value: 'gruvbox', label: 'Gruvbox' },
      { value: 'monokai', label: 'Monokai' },
      { value: 'solarized-dark', label: 'Solarized Dark' },
      { value: 'solarized-light', label: 'Solarized Light' },
      { value: 'amber', label: 'Amber' },
      { value: 'retro-green', label: 'Retro Green' },
    ]);
  });

  it('renders a non-default theme from the generated YAML', () => {
    const yaml = serializeProfileConfig(
      buildProfileConfig({
        ...defaultWizardAnswers,
        theme: 'matrix',
      }),
    );
    const parsed = parseProfileConfig(yaml);
    const svg = renderTerminalSvg(completeOutput, { theme: parsed.theme });
    const palette = getTheme('matrix');

    expect(parsed.theme).toBe('matrix');
    expect(svg).toContain(`fill="${palette.background}"`);
    expect(svg).toContain(`.accent { fill: ${palette.accent}; }`);
  });
});

describe('collectWizardAnswers', () => {
  it('does not start an interactive session without a TTY', async () => {
    await expect(collectWizardAnswers()).rejects.toBeInstanceOf(
      NonInteractiveError,
    );
  });

  it('asks for a single theme after metrics and before animation', () => {
    const source = readFileSync(
      new URL('../packages/cli/src/wizard/prompt.ts', import.meta.url),
      'utf8',
    );
    const metrics = source.indexOf("message: 'What do you want to show?'");
    const theme = source.indexOf("message: 'Theme'");
    const animation = source.indexOf("message: 'Animation'");
    const frequency = source.indexOf("message: 'Update frequency'");

    expect(metrics).toBeGreaterThan(-1);
    expect(theme).toBeGreaterThan(metrics);
    expect(animation).toBeGreaterThan(theme);
    expect(frequency).toBeGreaterThan(animation);
    expect(source).toContain('select<ThemeId>');
    expect(source).toContain('initialValue: defaultThemeId');
    expect(source).toContain('options: [...themeOptions]');
    expect(source).not.toContain('multiselect<ThemeId>');
  });
});

describe('runInit', () => {
  it('propagates cancellation without writing files', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'github-profile-sh-'));

    await expect(
      runInit({
        collectConfig: () => {
          throw new SetupCancelledError();
        },
        cwd: directory,
      }),
    ).rejects.toBeInstanceOf(SetupCancelledError);

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
