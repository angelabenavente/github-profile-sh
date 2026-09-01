import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_CONFIG_PATH,
  DEFAULT_OUTPUT_PATH,
} from '../packages/action/src/constants.js';
import { generateProfile } from '../packages/action/src/generate.js';
import { run, type ActionIO } from '../packages/action/src/run.js';
import { utcCalendarDate } from '../packages/action/src/today.js';
import { serializeProfileConfig } from '../packages/core/src/config/index.js';
import { defaultProfileConfig } from '../packages/core/src/config/schema.js';
import type {
  GitHubClient,
  ProfileStats,
} from '../packages/core/src/github/index.js';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'github-profile-sh-action-'));
}

const token = 'ghs_test_secret_token_do_not_log';

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

function writeConfig(cwd: string, name = DEFAULT_CONFIG_PATH) {
  const path = join(cwd, name);
  writeFileSync(path, serializeProfileConfig(defaultProfileConfig), 'utf8');
  return path;
}

function mockClient() {
  return { mock: 'octokit' } as unknown as GitHubClient;
}

describe('utcCalendarDate', () => {
  it('returns the UTC calendar date', () => {
    expect(utcCalendarDate(new Date('2026-08-30T23:10:00.000Z'))).toBe(
      '2026-08-30',
    );
    expect(utcCalendarDate(new Date('2026-08-31T00:10:00.000Z'))).toBe(
      '2026-08-31',
    );
  });
});

describe('generateProfile', () => {
  it('reads the default config and writes the default SVG', async () => {
    const cwd = tempDir();
    writeConfig(cwd);
    const client = mockClient();
    const createGitHubClient = vi.fn(() => client);
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));

    const result = await generateProfile({
      configPath: DEFAULT_CONFIG_PATH,
      outputPath: DEFAULT_OUTPUT_PATH,
      token,
      username: 'octocat',
      today: '2026-08-30',
      cwd,
      createGitHubClient,
      fetchProfileStats,
    });

    expect(createGitHubClient).toHaveBeenCalledWith({ token });
    expect(fetchProfileStats).toHaveBeenCalledWith(client, 'octocat', {
      today: '2026-08-30',
    });
    expect(result.svgPath).toBe(join(cwd, DEFAULT_OUTPUT_PATH));
    const svg = readFileSync(result.svgPath, 'utf8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('github-profile.sh');
    expect(svg).not.toContain(token);
  });

  it('fails when the configuration file cannot be read', async () => {
    const cwd = tempDir();
    const path = writeConfig(cwd);
    chmodSync(path, 0o000);

    try {
      await expect(
        generateProfile({
          configPath: DEFAULT_CONFIG_PATH,
          outputPath: DEFAULT_OUTPUT_PATH,
          token,
          username: 'octocat',
          today: '2026-08-30',
          cwd,
          fetchProfileStats: () => Promise.resolve(completeStats),
        }),
      ).rejects.toThrow(
        /Unable to read configuration file: github-profile-sh.yml/,
      );
    } finally {
      chmodSync(path, 0o644);
    }
  });

  it('fails when the configuration file is missing', async () => {
    await expect(
      generateProfile({
        configPath: DEFAULT_CONFIG_PATH,
        outputPath: DEFAULT_OUTPUT_PATH,
        token,
        username: 'octocat',
        today: '2026-08-30',
        cwd: tempDir(),
        fetchProfileStats: () => Promise.resolve(completeStats),
      }),
    ).rejects.toThrow('Configuration file not found: github-profile-sh.yml');
  });

  it('fails when the configuration is invalid', async () => {
    const cwd = tempDir();
    writeFileSync(join(cwd, DEFAULT_CONFIG_PATH), 'sections: true\n', 'utf8');

    await expect(
      generateProfile({
        configPath: DEFAULT_CONFIG_PATH,
        outputPath: DEFAULT_OUTPUT_PATH,
        token,
        username: 'octocat',
        today: '2026-08-30',
        cwd,
        fetchProfileStats: () => Promise.resolve(completeStats),
      }),
    ).rejects.toThrow(/Invalid profile config in github-profile-sh.yml/);
  });

  it('creates missing output directories', async () => {
    const cwd = tempDir();
    writeConfig(cwd);
    const outputPath = 'assets/github-profile.svg';

    const result = await generateProfile({
      configPath: DEFAULT_CONFIG_PATH,
      outputPath,
      token,
      username: 'octocat',
      today: '2026-08-30',
      cwd,
      createGitHubClient: () => mockClient(),
      fetchProfileStats: () => Promise.resolve(completeStats),
    });

    expect(result.svgPath).toBe(join(cwd, outputPath));
    expect(readFileSync(result.svgPath, 'utf8')).toContain('<svg');
  });

  it('still writes SVG when code changes are incomplete', async () => {
    const cwd = tempDir();
    writeConfig(cwd);

    const result = await generateProfile({
      configPath: DEFAULT_CONFIG_PATH,
      outputPath: DEFAULT_OUTPUT_PATH,
      token,
      username: 'octocat',
      today: '2026-08-30',
      cwd,
      createGitHubClient: () => mockClient(),
      fetchProfileStats: () => Promise.resolve(incompleteStats),
    });

    expect(readFileSync(result.svgPath, 'utf8')).toContain('<svg');
  });

  it('fails before creating a client when the token is empty', async () => {
    const createGitHubClient = vi.fn(() => mockClient());

    await expect(
      generateProfile({
        configPath: DEFAULT_CONFIG_PATH,
        outputPath: DEFAULT_OUTPUT_PATH,
        token: '   ',
        username: 'octocat',
        today: '2026-08-30',
        cwd: tempDir(),
        createGitHubClient,
        fetchProfileStats: () => Promise.resolve(completeStats),
      }),
    ).rejects.toThrow('GitHub token is required.');

    expect(createGitHubClient).not.toHaveBeenCalled();
  });

  it('fails when the username cannot be resolved', async () => {
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));

    await expect(
      generateProfile({
        configPath: DEFAULT_CONFIG_PATH,
        outputPath: DEFAULT_OUTPUT_PATH,
        token,
        username: '  ',
        today: '2026-08-30',
        cwd: tempDir(),
        fetchProfileStats,
      }),
    ).rejects.toThrow('Unable to resolve GitHub username.');

    expect(fetchProfileStats).not.toHaveBeenCalled();
  });

  it('fails when YAML is invalid', async () => {
    const cwd = tempDir();
    writeFileSync(join(cwd, DEFAULT_CONFIG_PATH), 'sections: [\n', 'utf8');

    await expect(
      generateProfile({
        configPath: DEFAULT_CONFIG_PATH,
        outputPath: DEFAULT_OUTPUT_PATH,
        token,
        username: 'octocat',
        today: '2026-08-30',
        cwd,
        fetchProfileStats: () => Promise.resolve(completeStats),
      }),
    ).rejects.toThrow(/Invalid YAML in github-profile-sh.yml/);
  });

  it('fails when the output path cannot be written', async () => {
    const cwd = tempDir();
    writeConfig(cwd);
    writeFileSync(join(cwd, 'blocked'), 'not a directory\n');

    await expect(
      generateProfile({
        configPath: DEFAULT_CONFIG_PATH,
        outputPath: 'blocked/github-profile.svg',
        token,
        username: 'octocat',
        today: '2026-08-30',
        cwd,
        createGitHubClient: () => mockClient(),
        fetchProfileStats: () => Promise.resolve(completeStats),
      }),
    ).rejects.toThrow(/Unable to write SVG to: blocked\/github-profile.svg/);
  });

  it('wraps REST failures with the HTTP status', async () => {
    const cwd = tempDir();
    writeConfig(cwd);

    await expect(
      generateProfile({
        configPath: DEFAULT_CONFIG_PATH,
        outputPath: DEFAULT_OUTPUT_PATH,
        token,
        username: 'octocat',
        today: '2026-08-30',
        cwd,
        createGitHubClient: () => mockClient(),
        fetchProfileStats: () =>
          Promise.reject(
            Object.assign(new Error('Forbidden'), { status: 403 }),
          ),
      }),
    ).rejects.toThrow('GitHub API request failed (403).');
  });

  it('wraps GraphQL failures', async () => {
    const cwd = tempDir();
    writeConfig(cwd);

    await expect(
      generateProfile({
        configPath: DEFAULT_CONFIG_PATH,
        outputPath: DEFAULT_OUTPUT_PATH,
        token,
        username: 'octocat',
        today: '2026-08-30',
        cwd,
        createGitHubClient: () => mockClient(),
        fetchProfileStats: () =>
          Promise.reject(
            Object.assign(new Error('Could not resolve to a User'), {
              name: 'GraphqlResponseError',
            }),
          ),
      }),
    ).rejects.toThrow(
      'GitHub GraphQL request failed: Could not resolve to a User',
    );
  });

  it('maps rate-limit-like API errors', async () => {
    const cwd = tempDir();
    writeConfig(cwd);

    await expect(
      generateProfile({
        configPath: DEFAULT_CONFIG_PATH,
        outputPath: DEFAULT_OUTPUT_PATH,
        token,
        username: 'octocat',
        today: '2026-08-30',
        cwd,
        createGitHubClient: () => mockClient(),
        fetchProfileStats: () =>
          Promise.reject(
            Object.assign(new Error('API rate limit exceeded for user'), {
              status: 403,
            }),
          ),
      }),
    ).rejects.toThrow('GitHub API rate limit reached. Try again later.');
  });
});

describe('run', () => {
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
      generate: (options) =>
        generateProfile({
          ...options,
          createGitHubClient: () => mockClient(),
          fetchProfileStats: () => Promise.resolve(completeStats),
        }),
      ...overrides,
    };

    return io;
  }

  it('uses default paths, the token input, and the repository owner', async () => {
    const cwd = tempDir();
    writeConfig(cwd);
    const client = mockClient();
    const createGitHubClient = vi.fn(() => client);
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));
    const io = createIO(cwd, {
      generate: (options) => {
        expect(options.configPath).toBe(DEFAULT_CONFIG_PATH);
        expect(options.outputPath).toBe(DEFAULT_OUTPUT_PATH);
        expect(options.token).toBe(token);
        expect(options.username).toBe('octocat');
        return generateProfile({
          ...options,
          createGitHubClient,
          fetchProfileStats,
        });
      },
    });

    await run(io);

    expect(io.failed).toBeUndefined();
    expect(io.setSecret).toHaveBeenCalledWith(token);
    expect(io.outputs['svg-path']).toBe(join(cwd, DEFAULT_OUTPUT_PATH));
    expect(io.logs.join('\n')).toContain('Reading configuration...');
    expect(io.logs.join('\n')).toContain('Fetching public profile data...');
    expect(io.logs.join('\n')).toContain('Generating SVG...');
    expect(io.logs.join('\n')).toContain(
      `Profile generated: ${DEFAULT_OUTPUT_PATH}`,
    );
    expect(io.logs.join('\n')).not.toContain(token);
    expect(createGitHubClient).toHaveBeenCalledWith({ token });
    expect(fetchProfileStats).toHaveBeenCalledWith(
      client,
      'octocat',
      expect.objectContaining({ today: '2026-08-30' }),
    );
  });

  it('marks the Action as failed when the core fetch fails', async () => {
    const cwd = tempDir();
    writeConfig(cwd);
    const io = createIO(cwd, {
      generate: () =>
        Promise.reject(new Error('GitHub API rate limit exceeded')),
    });

    await run(io);

    expect(io.failed).toBe('GitHub API rate limit exceeded');
    expect(io.outputs['svg-path']).toBeUndefined();
  });

  it('fails the Action when the token is missing', async () => {
    const cwd = tempDir();
    writeConfig(cwd);
    const generate = vi.fn();
    const io = createIO(cwd, {
      getInput: (name) => {
        if (name === 'token') {
          throw new Error(`Input required and not supplied: ${name}`);
        }
        return '';
      },
      generate,
    });

    await run(io);

    expect(generate).not.toHaveBeenCalled();
    expect(io.failed).toBe('GitHub token is required.');
    expect(io.failed).not.toContain(token);
    expect(io.outputs['svg-path']).toBeUndefined();
  });

  it('fails the Action when the token is empty', async () => {
    const cwd = tempDir();
    writeConfig(cwd);
    const generate = vi.fn();
    const io = createIO(cwd, {
      getInput: (name) => (name === 'token' ? '   ' : ''),
      generate,
    });

    await run(io);

    expect(generate).not.toHaveBeenCalled();
    expect(io.failed).toBe('GitHub token is required.');
  });

  it('fails the Action when the config is missing', async () => {
    const io = createIO(tempDir());

    await run(io);

    expect(io.failed).toBe(
      'Configuration file not found: github-profile-sh.yml',
    );
    expect(io.outputs['svg-path']).toBeUndefined();
  });

  it('redacts the token if an error message includes it', async () => {
    const cwd = tempDir();
    writeConfig(cwd);
    const io = createIO(cwd, {
      generate: () => Promise.reject(new Error(`auth failed for ${token}`)),
    });

    await run(io);

    expect(io.failed).toBe('auth failed for ***');
    expect(io.failed).not.toContain(token);
    expect(JSON.stringify(io.logs)).not.toContain(token);
  });

  it('fails the Action when rendering throws', async () => {
    const cwd = tempDir();
    writeConfig(cwd);
    const io = createIO(cwd, {
      generate: () =>
        Promise.reject(new Error('Unable to render profile SVG: boom')),
    });

    await run(io);

    expect(io.failed).toContain('Unable to render profile SVG');
    expect(io.outputs['svg-path']).toBeUndefined();
  });

  it('does not fail when code changes are incomplete', async () => {
    const cwd = tempDir();
    writeConfig(cwd);
    const io = createIO(cwd, {
      generate: (options) =>
        generateProfile({
          ...options,
          createGitHubClient: () => mockClient(),
          fetchProfileStats: () => Promise.resolve(incompleteStats),
        }),
    });

    await run(io);

    expect(io.failed).toBeUndefined();
    expect(io.outputs['svg-path']).toBe(join(cwd, DEFAULT_OUTPUT_PATH));
  });
});

describe('action.yml', () => {
  const yaml = readFileSync(new URL('../action.yml', import.meta.url), 'utf8');

  it('declares a Node 24 JavaScript action at the package bundle', () => {
    expect(yaml).toContain('using: node24');
    expect(yaml).toContain('main: dist/index.js');
    expect(yaml).toContain('default: github-profile-sh.yml');
    expect(yaml).toContain('default: github-profile.svg');
    expect(yaml).toContain('svg-path:');
  });
});

describe('action source', () => {
  it('does not commit or push', () => {
    const generate = readFileSync(
      new URL('../packages/action/src/generate.ts', import.meta.url),
      'utf8',
    );
    const runSource = readFileSync(
      new URL('../packages/action/src/run.ts', import.meta.url),
      'utf8',
    );
    const source = `${generate}\n${runSource}`;

    expect(source).not.toContain('git add');
    expect(source).not.toContain('git commit');
    expect(source).not.toContain('git push');
  });
});
