import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const cliPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../packages/cli/dist/index.js',
);

function runCli(args: string[]) {
  try {
    const stdout = execFileSync(process.execPath, [cliPath, ...args], {
      encoding: 'utf8',
    });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'status' in error &&
      'stdout' in error &&
      'stderr' in error
    ) {
      const result = error as {
        status: number | null;
        stdout: string;
        stderr: string;
      };
      return {
        code: result.status ?? 1,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }

    throw error;
  }
}

describe('github-profile-sh CLI', () => {
  it('prints help for --help', () => {
    const { code, stdout } = runCli(['--help']);

    expect(code).toBe(0);
    expect(stdout).toContain('github-profile-sh');
    expect(stdout).toContain('init');
    expect(stdout).toContain('Configure github-profile.sh');
  });

  it('runs init without writing files', () => {
    const directory = mkdtempSync(join(tmpdir(), 'github-profile-sh-'));
    const before = readdirSync(directory);
    const { code, stdout } = runCli(['init']);

    expect(code).toBe(0);
    expect(stdout).toContain('github-profile.sh');
    expect(stdout).toContain('Starting setup...');
    expect(readdirSync(directory)).toEqual(before);
  });

  it('rejects an unknown command', () => {
    const { code, stderr } = runCli(['definitely-not-a-command']);

    expect(code).toBe(1);
    expect(stderr).toContain('Unknown command: definitely-not-a-command');
  });
});
