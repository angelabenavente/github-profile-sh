import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { run } from '../packages/cli/src/cli.js';
import { runInit } from '../packages/cli/src/commands/init.js';
import {
  defaultProfileConfig,
  type ProfileConfig,
} from '../packages/core/src/config/schema.js';
import { SetupCancelledError } from '../packages/cli/src/wizard/prompt.js';

const secret = 'ghs_test_secret_token_do_not_log';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'github-profile-sh-cli-error-'));
}

async function runInitCommand(
  init: () => Promise<void>,
): Promise<{ code: number; stdout: string; stderr: string[] }> {
  const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  try {
    const code = await run(['node', 'github-profile-sh', 'init'], init);
    return {
      code,
      stdout: write.mock.calls.map(([chunk]) => String(chunk)).join(''),
      stderr: error.mock.calls.map(([message]) => String(message)),
    };
  } finally {
    write.mockRestore();
    error.mockRestore();
  }
}

describe('init expected errors', () => {
  it('cancels cleanly without a stack or Setup complete', async () => {
    const result = await runInitCommand(() => {
      throw new SetupCancelledError();
    });

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('Setup cancelled.\n');
    expect(result.stdout).not.toContain('Setup complete.');
    expect(result.stdout).not.toContain('Error:');
    expect(result.stderr).toEqual([]);
  });

  it('reports a config write failure with the filename', async () => {
    const cwd = tempDir();
    chmodSync(cwd, 0o555);

    try {
      const result = await runInitCommand(() =>
        runInit({
          collectConfig: () => defaultProfileConfig,
          cwd,
        }),
      );

      expect(result.code).toBe(1);
      expect(result.stderr.join('\n')).toContain(
        'Unable to write github-profile-sh.yml',
      );
      expect(result.stdout).not.toContain('Setup complete.');
      expect(result.stderr.join('\n')).not.toContain(secret);
    } finally {
      chmodSync(cwd, 0o755);
    }
  });

  it('reports a workflow directory failure after writing config', async () => {
    const cwd = tempDir();
    writeFileSync(join(cwd, '.github'), 'not a directory\n');

    const result = await runInitCommand(() =>
      runInit({
        collectConfig: () => defaultProfileConfig,
        cwd,
      }),
    );

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('✓ Created github-profile-sh.yml');
    expect(result.stdout).not.toContain('Setup complete.');
    expect(result.stderr.join('\n')).toContain(
      'Unable to write .github/workflows/github-profile-sh.yml',
    );
  });

  it('reports a workflow file write failure', async () => {
    const cwd = tempDir();
    mkdirSync(join(cwd, '.github'));
    writeFileSync(join(cwd, '.github/workflows'), 'not a directory\n');

    const result = await runInitCommand(() =>
      runInit({
        collectConfig: () => defaultProfileConfig,
        cwd,
      }),
    );

    expect(result.code).toBe(1);
    expect(result.stderr.join('\n')).toContain(
      'Unable to write .github/workflows/github-profile-sh.yml',
    );
    expect(result.stdout).not.toContain('Setup complete.');
  });

  it('reports invalid internal configuration without crashing', async () => {
    const result = await runInitCommand(() =>
      runInit({
        collectConfig: () =>
          ({
            sections: { repos: 'yes' },
          }) as unknown as ProfileConfig,
        cwd: tempDir(),
      }),
    );

    expect(result.code).toBe(1);
    expect(result.stderr.join('\n')).toContain('Invalid configuration');
    expect(result.stdout).not.toContain('Setup complete.');
  });
});
