import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseProfileConfig } from '../packages/core/src/config/index.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('E2E Action fixture', () => {
  it('parses as a real ProfileConfig', () => {
    const yaml = readFileSync(
      join(repoRoot, 'examples/e2e-profile.yml'),
      'utf8',
    );

    expect(parseProfileConfig(yaml)).toEqual({
      sections: {
        repos: true,
        stars: true,
        streak: true,
        codeChanges: true,
        languages: true,
      },
      theme: 'dark',
      animation: {
        enabled: true,
        mode: 'typing',
      },
      update: {
        frequency: 'manual',
      },
    });
  });
});

describe('E2E Action workflow', () => {
  const workflow = readFileSync(
    join(repoRoot, '.github/workflows/e2e-action.yml'),
    'utf8',
  );

  it('is a manual development workflow that runs the local Action', () => {
    expect(workflow).toContain('name: E2E Action Test');
    expect(workflow).toContain('\non:\n  workflow_dispatch:\n');
    expect(workflow).not.toContain('schedule:');
    expect(workflow).not.toContain('pull_request');
    expect(workflow).not.toContain('\n  push:');
    expect(workflow).toContain('uses: ./');
    expect(workflow).toContain('pnpm build:action');
    expect(workflow).toContain('config: examples/e2e-profile.yml');
    expect(workflow).toContain('output: tmp/e2e/github-profile.svg');
    expect(workflow).toContain('token: ${{ github.token }}');
    expect(workflow).toContain('uses: actions/checkout@v6');
    expect(workflow).toContain('name: github-profile-sh-e2e');
    expect(workflow).not.toContain('git commit');
    expect(workflow).not.toContain('git push');
  });
});
