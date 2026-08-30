import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { runInit } from '../packages/cli/src/commands/init.js';
import {
  PROFILE_CONFIG_FILENAME,
  writeProfileConfig,
} from '../packages/cli/src/config/write.js';
import {
  buildProfileConfig,
  defaultWizardAnswers,
} from '../packages/cli/src/wizard/config.js';
import {
  defaultOverwrite,
  SetupCancelledError,
} from '../packages/cli/src/wizard/prompt.js';
import { serializeProfileConfig } from '../packages/core/src/config/index.js';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'github-profile-sh-'));
}

const defaultConfig = buildProfileConfig(defaultWizardAnswers);
const partialConfig = buildProfileConfig({
  sections: ['repos', 'stars', 'languages'],
  animation: 'none',
  frequency: 'manual',
});

describe('writeProfileConfig', () => {
  it('creates github-profile-sh.yml in a configurable directory', async () => {
    const cwd = tempDir();
    const result = await writeProfileConfig(defaultConfig, { cwd });

    expect(result.status).toBe('created');
    expect(result.path).toBe(join(cwd, PROFILE_CONFIG_FILENAME));
    expect(readdirSync(cwd)).toEqual([PROFILE_CONFIG_FILENAME]);
    expect(readFileSync(result.path, 'utf8')).toBe(
      serializeProfileConfig(defaultConfig),
    );
  });

  it('writes disabled metrics, none animation, and manual updates', async () => {
    const cwd = tempDir();
    const result = await writeProfileConfig(partialConfig, { cwd });
    const yaml = readFileSync(result.path, 'utf8');

    expect(yaml).toContain('codeChanges: false');
    expect(yaml).toContain('streak: false');
    expect(yaml).toContain('mode: none');
    expect(yaml).toContain('enabled: false');
    expect(yaml).toContain('frequency: manual');
    expect(readdirSync(cwd)).toEqual([PROFILE_CONFIG_FILENAME]);
  });

  it('overwrites when the user confirms yes', async () => {
    const cwd = tempDir();
    const path = join(cwd, PROFILE_CONFIG_FILENAME);
    writeFileSync(path, 'theme: leftover\n', 'utf8');

    const result = await writeProfileConfig(defaultConfig, {
      cwd,
      confirmOverwrite: () => true,
    });

    expect(result.status).toBe('overwritten');
    expect(readFileSync(path, 'utf8')).toBe(
      serializeProfileConfig(defaultConfig),
    );
    expect(readdirSync(cwd)).toEqual([PROFILE_CONFIG_FILENAME]);
  });

  it('keeps the existing file when overwrite is no', async () => {
    const cwd = tempDir();
    const path = join(cwd, PROFILE_CONFIG_FILENAME);
    writeFileSync(path, 'theme: leftover\n', 'utf8');

    const result = await writeProfileConfig(defaultConfig, {
      cwd,
      confirmOverwrite: () => false,
    });

    expect(result.status).toBe('skipped');
    expect(readFileSync(path, 'utf8')).toBe('theme: leftover\n');
    expect(readdirSync(cwd)).toEqual([PROFILE_CONFIG_FILENAME]);
  });

  it('defaults the overwrite prompt to no', () => {
    expect(defaultOverwrite).toBe(false);
  });

  it('does not modify the file when overwrite is cancelled', async () => {
    const cwd = tempDir();
    const path = join(cwd, PROFILE_CONFIG_FILENAME);
    writeFileSync(path, 'theme: leftover\n', 'utf8');

    await expect(
      writeProfileConfig(defaultConfig, {
        cwd,
        confirmOverwrite: () => {
          throw new SetupCancelledError();
        },
      }),
    ).rejects.toBeInstanceOf(SetupCancelledError);
    expect(readFileSync(path, 'utf8')).toBe('theme: leftover\n');
    expect(readdirSync(cwd)).toEqual([PROFILE_CONFIG_FILENAME]);
  });
});

describe('runInit file creation', () => {
  it('creates only github-profile-sh.yml', async () => {
    const cwd = tempDir();
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    try {
      await runInit({
        collectConfig: () => defaultConfig,
        cwd,
      });
      expect(
        write.mock.calls.map(([chunk]) => String(chunk)).join(''),
      ).toContain('✓ Created github-profile-sh.yml');
    } finally {
      write.mockRestore();
    }

    expect(readdirSync(cwd)).toContain(PROFILE_CONFIG_FILENAME);
    expect(readdirSync(cwd)).not.toContain('README.md');
    expect(readFileSync(join(cwd, PROFILE_CONFIG_FILENAME), 'utf8')).toBe(
      serializeProfileConfig(defaultConfig),
    );
  });

  it('keeps an existing file when overwrite is declined', async () => {
    const cwd = tempDir();
    const path = join(cwd, PROFILE_CONFIG_FILENAME);
    writeFileSync(path, 'theme: leftover\n', 'utf8');
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    try {
      await runInit({
        collectConfig: () => defaultConfig,
        confirmOverwriteConfig: () => false,
        cwd,
      });
      expect(
        write.mock.calls.map(([chunk]) => String(chunk)).join(''),
      ).toContain('✓ Kept existing github-profile-sh.yml');
    } finally {
      write.mockRestore();
    }

    expect(readFileSync(path, 'utf8')).toBe('theme: leftover\n');
  });
});
