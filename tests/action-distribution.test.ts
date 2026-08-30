import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  ACTION_REPOSITORY,
  GITHUB_PROFILE_ACTION,
} from '../packages/cli/src/workflow/action-ref.js';
import { generateWorkflow } from '../packages/cli/src/workflow/generate.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function isIgnored(relativePath: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '--no-index', '-q', relativePath], {
      cwd: repoRoot,
    });
    return true;
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'status' in error &&
      error.status === 1
    ) {
      return false;
    }

    throw error;
  }
}

describe('Action root distribution', () => {
  const actionYml = readFileSync(join(repoRoot, 'action.yml'), 'utf8');

  it('keeps a single action.yml at the repository root', () => {
    expect(existsSync(join(repoRoot, 'action.yml'))).toBe(true);
    expect(existsSync(join(repoRoot, 'packages/action/action.yml'))).toBe(
      false,
    );
    expect(actionYml).toContain('using: node24');
    expect(actionYml).toContain('main: dist/index.js');
    expect(actionYml).toContain('config:');
    expect(actionYml).toContain('output:');
    expect(actionYml).toContain('token:');
    expect(actionYml).toContain('svg-path:');
  });

  it('points runs.main at a bundle that exists after build', () => {
    expect(existsSync(join(repoRoot, 'dist/index.js'))).toBe(true);
    expect(existsSync(join(repoRoot, 'packages/action/src/index.ts'))).toBe(
      true,
    );
  });

  it('does not ignore the published Action bundle', () => {
    expect(isIgnored('dist/index.js')).toBe(false);
    expect(isIgnored('packages/cli/dist/index.js')).toBe(true);
    expect(isIgnored('packages/action/dist/index.js')).toBe(true);
  });
});

describe('generated user workflow', () => {
  const yaml = generateWorkflow('daily');

  it('uses the published Action reference, not a local path', () => {
    expect(ACTION_REPOSITORY).toBe('angelabenavente/github-profile-sh');
    expect(GITHUB_PROFILE_ACTION).toBe('angelabenavente/github-profile-sh@v1');
    expect(yaml).toContain(`uses: ${GITHUB_PROFILE_ACTION}`);
    expect(yaml).toContain('config: github-profile-sh.yml');
    expect(yaml).toContain('output: github-profile.svg');
    expect(yaml).toContain('token: ${{ github.token }}');
    expect(yaml).not.toContain('uses: ./');
  });
});

describe('E2E workflow stays local', () => {
  const workflow = readFileSync(
    join(repoRoot, '.github/workflows/e2e-action.yml'),
    'utf8',
  );

  it('builds and runs the Action from the checkout', () => {
    expect(workflow).toContain('uses: ./');
    expect(workflow).toContain('pnpm build:action');
    expect(workflow).not.toContain(`uses: ${GITHUB_PROFILE_ACTION}`);
  });
});
