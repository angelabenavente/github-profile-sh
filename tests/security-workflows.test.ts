import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { generateWorkflow } from '../packages/cli/src/workflow/generate.js';
import {
  PROFILE_COMMIT_MESSAGE,
  PROFILE_SVG_FILENAME,
} from '../packages/cli/src/workflow/generate.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('generated user workflow', () => {
  const yaml = generateWorkflow('daily');

  it('uses contents: write and no extra permissions', () => {
    expect(yaml).toContain('\npermissions:\n  contents: write\n');
    expect(yaml).not.toContain('actions: write');
    expect(yaml).not.toContain('packages: write');
    expect(yaml).not.toContain('pull-requests: write');
    expect(yaml).not.toContain('issues: write');
    expect(yaml).not.toContain('id-token: write');
  });

  it('stages only the profile SVG', () => {
    expect(yaml).toContain(`git add ${PROFILE_SVG_FILENAME}`);
    expect(yaml).not.toContain('git add .');
    expect(yaml).not.toContain('git add -A');
    expect(yaml).not.toContain('git add --all');
    expect(yaml).toContain(`git commit -m "${PROFILE_COMMIT_MESSAGE}"`);
  });

  it('does not embed hardcoded secrets', () => {
    expect(yaml).toContain('token: ${{ github.token }}');
    expect(yaml).not.toMatch(/ghp_|ghs_|github_pat_|npm_[A-Za-z0-9]/);
    expect(yaml).not.toContain('NPM_TOKEN');
    expect(yaml).not.toContain('persist-credentials: false');
  });
});

describe('repository workflows', () => {
  it('keeps CI read-only', () => {
    const yaml = readRepo('.github/workflows/ci.yml');

    expect(yaml).toContain('\npermissions:\n  contents: read\n');
    expect(yaml).not.toContain('contents: write');
    expect(yaml).toContain('persist-credentials: false');
    expect(yaml).not.toMatch(/uses: .*(@main|@master)\b/);
  });

  it('keeps E2E read-only', () => {
    const yaml = readRepo('.github/workflows/e2e-action.yml');

    expect(yaml).toContain('\npermissions:\n  contents: read\n');
    expect(yaml).not.toContain('contents: write');
    expect(yaml).toContain('persist-credentials: false');
  });

  it('publishes only the CLI package on version tags', () => {
    const yaml = readRepo('.github/workflows/release.yml');

    expect(yaml).toContain("tags:\n      - 'v*.*.*'");
    expect(yaml).toContain('working-directory: packages/cli');
    expect(yaml).toContain('run: npm publish');
    expect(yaml).not.toContain('pnpm -r publish');
    expect(yaml).not.toContain('pnpm publish -r');
    expect(yaml).not.toContain('pnpm --filter @github-profile-sh/core publish');
    expect(yaml).toContain('persist-credentials: false');
    expect(yaml).toContain('NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}');
  });
});

describe('CLI package files', () => {
  it('does not publish workspace internals or secrets', () => {
    const manifest = JSON.parse(readRepo('packages/cli/package.json')) as {
      files?: string[];
    };

    expect(manifest.files).toEqual(['dist', 'README.md', 'LICENSE']);
    expect(manifest.files).not.toContain('.env');
    expect(manifest.files).not.toContain('.github');
    expect(manifest.files).not.toContain('src');
    expect(manifest.files).not.toContain('tests');
  });
});
