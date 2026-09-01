import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const cliRoot = join(repoRoot, 'packages/cli');
const manifest = JSON.parse(
  readFileSync(join(cliRoot, 'package.json'), 'utf8'),
) as {
  name: string;
  private?: boolean;
  bin?: Record<string, string>;
  engines?: { node?: string };
  files?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe('CLI package manifest', () => {
  it('is a public unscoped package named github-profile-sh', () => {
    expect(manifest.name).toBe('github-profile-sh');
    expect(manifest.private).toBeUndefined();
  });

  it('points bin at the compiled JavaScript entry', () => {
    expect(manifest.bin).toEqual({
      'github-profile-sh': './dist/index.js',
    });
  });

  it('requires Node.js 24', () => {
    expect(manifest.engines?.node).toBe('>=24');
  });

  it('publishes only the built CLI and package README', () => {
    expect(manifest.files).toEqual(['dist', 'README.md']);
  });

  it('does not declare workspace or unpublished runtime dependencies', () => {
    expect(manifest.dependencies ?? {}).toEqual({});

    for (const [name, spec] of Object.entries(manifest.dependencies ?? {})) {
      expect(`${name}@${spec}`).not.toContain('workspace:');
    }
  });
});

describe('CLI executable', () => {
  it('keeps a Node shebang on the TypeScript entry', () => {
    const source = readFileSync(join(cliRoot, 'src/index.ts'), 'utf8');
    expect(source.startsWith('#!/usr/bin/env node\n')).toBe(true);
  });

  it('emits a self-contained JS bin after build', () => {
    const bundle = join(cliRoot, 'dist/index.js');

    if (!existsSync(bundle)) {
      return;
    }

    const contents = readFileSync(bundle, 'utf8');
    expect(contents.startsWith('#!/usr/bin/env node')).toBe(true);
    expect(contents).not.toContain('workspace:*');
    expect(contents).not.toContain('@github-profile-sh/core/');
  });
});
