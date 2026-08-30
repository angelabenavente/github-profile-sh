import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const actionRoot = join(repoRoot, 'packages/action');

describe('action bundle', () => {
  it('can be regenerated and checked by Node 24', { timeout: 60_000 }, () => {
    const output = mkdtempSync(
      join(tmpdir(), 'github-profile-sh-action-dist-'),
    );
    const ncc = join(actionRoot, 'node_modules/@vercel/ncc/dist/ncc/cli.js');
    const entry = join(actionRoot, 'src/index.ts');

    execFileSync(process.execPath, [ncc, 'build', entry, '-o', output], {
      cwd: actionRoot,
      encoding: 'utf8',
    });

    const bundle = join(output, 'index.js');
    expect(existsSync(bundle)).toBe(true);
    execFileSync(process.execPath, ['--check', bundle]);

    const contents = readFileSync(bundle, 'utf8');
    expect(contents).not.toContain('/Users/');
    expect(contents).not.toContain('workspace:*');
    expect(contents).not.toContain('file:///');
  });
});
