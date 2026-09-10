import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_CONFIG_PATH,
  DEFAULT_OUTPUT_PATH,
} from '../packages/action/src/constants.js';
import { generateFromManifest } from '../packages/action/src/generate-manifest.js';
import { run, type ActionIO } from '../packages/action/src/run.js';
import { serializeProfileConfig } from '../packages/core/src/config/index.js';
import { getTheme } from '../packages/core/src/theme/index.js';
import {
  defaultProfileConfig,
  type ProfileConfig,
} from '../packages/core/src/config/schema.js';
import type {
  GitHubClient,
  ProfileStats,
} from '../packages/core/src/github/index.js';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'github-profile-sh-manifest-'));
}

const token = 'ghs_test_secret_token_do_not_log';
const manifestPath = 'github-profile-sh.outputs.yml';

const completeStats: ProfileStats = {
  username: 'octocat',
  repos: 12,
  stars: 340,
  currentStreak: 4,
  codeChanges: {
    additions: 100,
    deletions: 20,
    total: 120,
    complete: true,
  },
  topLanguages: [{ name: 'TypeScript', bytes: 800, percentage: 100 }],
};

const incompleteStats: ProfileStats = {
  ...completeStats,
  codeChanges: {
    ...completeStats.codeChanges,
    complete: false,
  },
};

const ubuntuTyping: ProfileConfig = {
  ...defaultProfileConfig,
  theme: 'ubuntu',
  sections: {
    ...defaultProfileConfig.sections,
    languages: false,
  },
  animation: {
    enabled: true,
    mode: 'typing',
  },
};

const matrixLanguages: ProfileConfig = {
  ...defaultProfileConfig,
  theme: 'matrix',
  sections: {
    repos: false,
    stars: false,
    streak: false,
    codeChanges: false,
    languages: true,
  },
  animation: {
    enabled: true,
    mode: 'sequential',
  },
};

const macosChanges: ProfileConfig = {
  ...defaultProfileConfig,
  theme: 'macos',
  sections: {
    repos: false,
    stars: false,
    streak: false,
    codeChanges: true,
    languages: false,
  },
  animation: {
    enabled: true,
    mode: 'none',
  },
};

function writeYaml(cwd: string, relativePath: string, contents: string) {
  writeFileSync(join(cwd, relativePath), contents, 'utf8');
}

function writeConfig(cwd: string, relativePath: string, config: ProfileConfig) {
  writeYaml(cwd, relativePath, serializeProfileConfig(config));
}

function writeManifest(
  cwd: string,
  profiles: Array<{ config: string; output: string }>,
  path = manifestPath,
) {
  const yaml = [
    'profiles:',
    ...profiles.flatMap((profile) => [
      `  - config: ${profile.config}`,
      `    output: ${profile.output}`,
    ]),
    '',
  ].join('\n');
  writeYaml(cwd, path, yaml);
}

function mockClient() {
  return { mock: 'octokit' } as unknown as GitHubClient;
}

describe('generateFromManifest', () => {
  it('loads every config before fetching and fetches once', async () => {
    const cwd = tempDir();
    writeConfig(cwd, 'main.yml', ubuntuTyping);
    writeConfig(cwd, 'languages.yml', matrixLanguages);
    writeManifest(cwd, [
      { config: 'main.yml', output: 'b.svg' },
      { config: 'languages.yml', output: 'a.svg' },
    ]);
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));
    const logs: string[] = [];

    const result = await generateFromManifest({
      manifestPath,
      token,
      username: 'octocat',
      today: '2026-08-30',
      cwd,
      createGitHubClient: () => mockClient(),
      fetchProfileStats,
      log: (message) => {
        logs.push(message);
      },
    });

    expect(fetchProfileStats).toHaveBeenCalledTimes(1);
    expect(result.outputs).toEqual(['b.svg', 'a.svg']);
    expect(result.svgPaths).toEqual([join(cwd, 'b.svg'), join(cwd, 'a.svg')]);
    expect(existsSync(join(cwd, 'b.svg'))).toBe(true);
    expect(existsSync(join(cwd, 'a.svg'))).toBe(true);
    expect(readFileSync(join(cwd, 'b.svg'), 'utf8')).toContain(
      `fill="${getTheme('ubuntu').background}"`,
    );
    expect(readFileSync(join(cwd, 'a.svg'), 'utf8')).toContain('top languages');
    expect(logs).toEqual([
      'Reading manifest...',
      'Loading 2 profile configurations...',
      'Fetching public profile data...',
      'Generating 2 SVGs...',
      'Profile generated: b.svg',
      'Profile generated: a.svg',
    ]);
    expect(logs.join('\n')).not.toContain(token);
  });

  it('generates one, two, and three outputs from independent configs', async () => {
    const cwd = tempDir();
    writeConfig(cwd, 'one.yml', ubuntuTyping);
    writeConfig(cwd, 'two.yml', matrixLanguages);
    writeConfig(cwd, 'three.yml', macosChanges);
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));

    writeManifest(cwd, [{ config: 'one.yml', output: 'one.svg' }]);
    await generateFromManifest({
      manifestPath,
      token,
      username: 'octocat',
      today: '2026-08-30',
      cwd,
      fetchProfileStats,
    });
    expect(existsSync(join(cwd, 'one.svg'))).toBe(true);
    expect(fetchProfileStats).toHaveBeenCalledTimes(1);

    writeManifest(cwd, [
      { config: 'one.yml', output: 'two-a.svg' },
      { config: 'two.yml', output: 'two-b.svg' },
    ]);
    await generateFromManifest({
      manifestPath,
      token,
      username: 'octocat',
      today: '2026-08-30',
      cwd,
      fetchProfileStats,
    });
    expect(existsSync(join(cwd, 'two-a.svg'))).toBe(true);
    expect(existsSync(join(cwd, 'two-b.svg'))).toBe(true);
    expect(fetchProfileStats).toHaveBeenCalledTimes(2);

    writeManifest(cwd, [
      { config: 'one.yml', output: 'three-a.svg' },
      { config: 'two.yml', output: 'three-b.svg' },
      { config: 'three.yml', output: 'three-c.svg' },
    ]);
    const three = await generateFromManifest({
      manifestPath,
      token,
      username: 'octocat',
      today: '2026-08-30',
      cwd,
      fetchProfileStats,
    });
    expect(three.outputs).toEqual([
      'three-a.svg',
      'three-b.svg',
      'three-c.svg',
    ]);
    expect(existsSync(join(cwd, 'three-c.svg'))).toBe(true);
    expect(fetchProfileStats).toHaveBeenCalledTimes(3);
  });

  it('does not fetch when a later config is missing', async () => {
    const cwd = tempDir();
    writeConfig(cwd, 'main.yml', ubuntuTyping);
    writeManifest(cwd, [
      { config: 'main.yml', output: 'main.svg' },
      { config: 'missing.yml', output: 'missing.svg' },
    ]);
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));

    await expect(
      generateFromManifest({
        manifestPath,
        token,
        username: 'octocat',
        today: '2026-08-30',
        cwd,
        fetchProfileStats,
      }),
    ).rejects.toThrow('Configuration file not found: missing.yml');

    expect(fetchProfileStats).not.toHaveBeenCalled();
    expect(existsSync(join(cwd, 'main.svg'))).toBe(false);
  });

  it('does not fetch when a later config is invalid', async () => {
    const cwd = tempDir();
    writeConfig(cwd, 'main.yml', ubuntuTyping);
    writeYaml(cwd, 'broken.yml', 'theme: not-a-theme\n');
    writeManifest(cwd, [
      { config: 'main.yml', output: 'main.svg' },
      { config: 'broken.yml', output: 'broken.svg' },
    ]);
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));

    await expect(
      generateFromManifest({
        manifestPath,
        token,
        username: 'octocat',
        today: '2026-08-30',
        cwd,
        fetchProfileStats,
      }),
    ).rejects.toThrow('Invalid profile config in broken.yml:');

    expect(fetchProfileStats).not.toHaveBeenCalled();
    expect(existsSync(join(cwd, 'main.svg'))).toBe(false);
  });

  it('fails before fetch when the manifest is missing', async () => {
    const cwd = tempDir();
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));

    await expect(
      generateFromManifest({
        manifestPath,
        token,
        username: 'octocat',
        today: '2026-08-30',
        cwd,
        fetchProfileStats,
      }),
    ).rejects.toThrow(`Manifest file not found: ${manifestPath}`);

    expect(fetchProfileStats).not.toHaveBeenCalled();
  });

  it('does not fail when code changes are incomplete', async () => {
    const cwd = tempDir();
    writeConfig(cwd, 'main.yml', ubuntuTyping);
    writeManifest(cwd, [{ config: 'main.yml', output: 'main.svg' }]);

    await generateFromManifest({
      manifestPath,
      token,
      username: 'octocat',
      today: '2026-08-30',
      cwd,
      fetchProfileStats: () => Promise.resolve(incompleteStats),
    });

    expect(existsSync(join(cwd, 'main.svg'))).toBe(true);
  });
});

describe('run manifest mode', () => {
  function createIO(
    cwd: string,
    overrides: Partial<ActionIO> = {},
  ): ActionIO & {
    logs: string[];
    outputs: Record<string, string>;
    failed?: string;
  } {
    const logs: string[] = [];
    const outputs: Record<string, string> = {};
    const io: ActionIO & {
      logs: string[];
      outputs: Record<string, string>;
      failed?: string;
    } = {
      logs,
      outputs,
      getInput: (name) => {
        if (name === 'token') {
          return token;
        }
        if (name === 'manifest') {
          return manifestPath;
        }
        if (name === 'config') {
          return DEFAULT_CONFIG_PATH;
        }
        if (name === 'output') {
          return DEFAULT_OUTPUT_PATH;
        }
        return '';
      },
      getRepositoryOwner: () => 'octocat',
      setSecret: vi.fn(),
      setOutput: (name, value) => {
        outputs[name] = value;
      },
      setFailed: (message) => {
        io.failed = message;
      },
      info: (message) => {
        logs.push(message);
      },
      today: '2026-08-30',
      cwd,
      generateFromManifest: (options) =>
        generateFromManifest({
          ...options,
          createGitHubClient: () => mockClient(),
          fetchProfileStats: () => Promise.resolve(completeStats),
        }),
      ...overrides,
    };

    return io;
  }

  it('activates multi mode from manifest and ignores config/output defaults', async () => {
    const cwd = tempDir();
    writeConfig(cwd, 'main.yml', ubuntuTyping);
    writeConfig(cwd, 'languages.yml', matrixLanguages);
    writeManifest(cwd, [
      { config: 'main.yml', output: 'github-profile.svg' },
      { config: 'languages.yml', output: 'github-languages.svg' },
    ]);
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));
    const generate = vi.fn();
    const io = createIO(cwd, {
      generate,
      generateFromManifest: (options) =>
        generateFromManifest({
          ...options,
          createGitHubClient: () => mockClient(),
          fetchProfileStats,
        }),
    });

    await run(io);

    expect(io.failed).toBeUndefined();
    expect(generate).not.toHaveBeenCalled();
    expect(fetchProfileStats).toHaveBeenCalledTimes(1);
    expect(existsSync(join(cwd, DEFAULT_CONFIG_PATH))).toBe(false);
    expect(existsSync(join(cwd, DEFAULT_OUTPUT_PATH))).toBe(true);
    expect(io.outputs['svg-path']).toBeUndefined();
    expect(io.outputs['svg-paths']).toBe(
      JSON.stringify(['github-profile.svg', 'github-languages.svg']),
    );
    expect(io.logs.join('\n')).toContain('Reading manifest...');
    expect(io.logs.join('\n')).not.toContain('Reading configuration...');
    expect(io.logs.join('\n')).not.toContain(token);
  });

  it('keeps svg-paths in manifest order', async () => {
    const cwd = tempDir();
    writeConfig(cwd, 'main.yml', ubuntuTyping);
    writeConfig(cwd, 'languages.yml', matrixLanguages);
    writeManifest(cwd, [
      { config: 'languages.yml', output: 'z.svg' },
      { config: 'main.yml', output: 'a.svg' },
    ]);
    const io = createIO(cwd);

    await run(io);

    expect(io.outputs['svg-paths']).toBe(JSON.stringify(['z.svg', 'a.svg']));
    expect(io.outputs['svg-path']).toBeUndefined();
  });
});
