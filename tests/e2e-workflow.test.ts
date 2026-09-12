import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseOutputsManifest } from '../packages/action/src/manifest/index.js';
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

  it('parses the multi-output manifest fixture', () => {
    const yaml = readFileSync(
      join(repoRoot, 'examples/e2e-outputs.yml'),
      'utf8',
    );
    const main = parseProfileConfig(
      readFileSync(join(repoRoot, 'examples/multi-svg/main.yml'), 'utf8'),
    );
    const languages = parseProfileConfig(
      readFileSync(join(repoRoot, 'examples/multi-svg/languages.yml'), 'utf8'),
    );

    expect(parseOutputsManifest(yaml)).toEqual({
      profiles: [
        {
          config: 'examples/multi-svg/main.yml',
          output: 'tmp/e2e-multi/main.svg',
        },
        {
          config: 'examples/multi-svg/languages.yml',
          output: 'tmp/e2e-multi/languages.svg',
        },
      ],
    });
    expect(main.theme).toBe('ubuntu');
    expect(languages.theme).toBe('matrix');
    expect(main.sections.languages).toBe(false);
    expect(languages.sections.languages).toBe(true);
  });
});

describe('E2E Action workflow', () => {
  const workflow = readFileSync(
    join(repoRoot, '.github/workflows/e2e-action.yml'),
    'utf8',
  );

  it('is a valid manual workflow with separate single and multi jobs', () => {
    expect(workflow).toContain('name: E2E Action Test');
    expect(workflow).toContain('\non:\n  workflow_dispatch:\n');
    expect(workflow).toContain('e2e-single:');
    expect(workflow).toContain('name: E2E single');
    expect(workflow).toContain('e2e-multi:');
    expect(workflow).toContain('name: E2E multi');
    expect(workflow).not.toContain('schedule:');
    expect(workflow).not.toContain('pull_request');
    expect(workflow).not.toContain('\n  push:');
    expect(workflow).toContain('uses: ./');
    expect(workflow).toContain('pnpm build:action');
    expect(workflow).toContain('token: ${{ github.token }}');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).not.toContain('git commit');
    expect(workflow).not.toContain('git push');
  });

  it('keeps the single-output compatibility path', () => {
    expect(workflow).toContain('config: examples/e2e-profile.yml');
    expect(workflow).toContain('output: tmp/e2e/github-profile.svg');
    expect(workflow).toContain('name: github-profile-sh-e2e');
    expect(workflow).toContain('path: tmp/e2e/github-profile.svg');
    expect(workflow).toContain('steps.generate.outputs.svg-path');
    expect(workflow).toContain('steps.generate.outputs.svg-paths');
  });

  it('runs multi-output from one Action invocation', () => {
    const multiJob = workflow.slice(workflow.indexOf('e2e-multi:'));
    const multiActionUses = (multiJob.match(/uses: \.\//g) ?? []).length;

    expect(multiActionUses).toBe(1);
    expect(workflow).toContain('manifest: examples/e2e-outputs.yml');
    expect(workflow).toContain('tmp/e2e-multi/main.svg');
    expect(workflow).toContain('tmp/e2e-multi/languages.svg');
    expect(workflow).toContain('name: github-profile-sh-multi-e2e');
    expect(workflow).toContain('path: tmp/e2e-multi/');
    expect(workflow).toContain('svg-path must be empty in multi mode');
    expect(workflow).toContain('uses: actions/checkout@v6');
  });
});
