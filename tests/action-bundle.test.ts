import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const actionRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../packages/action',
);

describe('action bundle', () => {
  it('can be generated and checked by Node 24', { timeout: 60_000 }, () => {
    const output = mkdtempSync(
      join(tmpdir(), 'github-profile-sh-action-dist-'),
    );
    const ncc = join(actionRoot, 'node_modules/@vercel/ncc/dist/ncc/cli.js');
    const entry = join(actionRoot, 'src/index.ts');

    execFileSync(
      process.execPath,
      [ncc, 'build', entry, '-o', output, '--license', 'licenses.txt'],
      {
        cwd: actionRoot,
        encoding: 'utf8',
      },
    );

    const bundle = join(output, 'index.js');
    expect(existsSync(bundle)).toBe(true);
    execFileSync(process.execPath, ['--check', bundle]);
  });
});
