import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { generateProfileOutputs } from '../packages/action/src/generate-outputs.js';
import { renderProfileSvg } from '../packages/action/src/render.js';
import {
  defaultProfileConfig,
  type ProfileConfig,
} from '../packages/core/src/config/schema.js';
import type {
  GitHubClient,
  ProfileStats,
} from '../packages/core/src/github/index.js';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'github-profile-sh-outputs-'));
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

const metricsConfig = {
  ...defaultProfileConfig,
  theme: 'ubuntu' as const,
  sections: {
    ...defaultProfileConfig.sections,
    languages: false,
  },
  animation: {
    enabled: true,
    mode: 'typing' as const,
  },
};

const languagesConfig = {
  ...defaultProfileConfig,
  theme: 'matrix' as const,
  sections: {
    repos: false,
    stars: false,
    streak: false,
    codeChanges: false,
    languages: true,
  },
  animation: {
    enabled: true,
    mode: 'sequential' as const,
  },
};

const changesConfig = {
  ...defaultProfileConfig,
  theme: 'macos' as const,
  sections: {
    repos: false,
    stars: false,
    streak: false,
    codeChanges: true,
    languages: false,
  },
  animation: {
    enabled: true,
    mode: 'none' as const,
  },
};

function mockClient() {
  return { mock: 'octokit' } as unknown as GitHubClient;
}

function generate(options: {
  cwd: string;
  targets: Parameters<typeof generateProfileOutputs>[0]['targets'];
  fetchProfileStats?: (
    client: GitHubClient,
    username: string,
    fetchOptions: { today: string },
  ) => Promise<ProfileStats>;
  renderProfileSvg?: typeof renderProfileSvg;
  token?: string;
  username?: string;
  today?: string;
}) {
  return generateProfileOutputs({
    token: options.token ?? token,
    username: options.username ?? 'octocat',
    today: options.today ?? '2026-08-30',
    targets: options.targets,
    cwd: options.cwd,
    createGitHubClient: () => mockClient(),
    fetchProfileStats:
      options.fetchProfileStats ?? (() => Promise.resolve(completeStats)),
    renderProfileSvg: options.renderProfileSvg,
  });
}

describe('generateProfileOutputs', () => {
  it('writes one SVG from a single target', async () => {
    const cwd = tempDir();
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));

    const result = await generate({
      cwd,
      fetchProfileStats,
      targets: [{ config: defaultProfileConfig, output: 'github-profile.svg' }],
    });

    expect(fetchProfileStats).toHaveBeenCalledTimes(1);
    expect(result.svgPaths).toEqual([join(cwd, 'github-profile.svg')]);
    expect(readFileSync(result.svgPaths[0] ?? '', 'utf8')).toContain(
      'github-profile.sh',
    );
  });

  it('writes two independent SVGs after one fetch', async () => {
    const cwd = tempDir();
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));

    const result = await generate({
      cwd,
      fetchProfileStats,
      targets: [
        { config: metricsConfig, output: 'github-profile.svg' },
        { config: languagesConfig, output: 'github-languages.svg' },
      ],
    });

    const main = readFileSync(result.svgPaths[0] ?? '', 'utf8');
    const languages = readFileSync(result.svgPaths[1] ?? '', 'utf8');

    expect(fetchProfileStats).toHaveBeenCalledTimes(1);
    expect(result.svgPaths).toEqual([
      join(cwd, 'github-profile.svg'),
      join(cwd, 'github-languages.svg'),
    ]);
    expect(main).not.toBe(languages);
    expect(main).toContain('repos');
    expect(main).not.toContain('top languages');
    expect(languages).toContain('top languages');
    expect(languages).not.toContain('repos');
  });

  it('writes three targets with distinct sections, themes, and animation', async () => {
    const cwd = tempDir();
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));

    const result = await generate({
      cwd,
      fetchProfileStats,
      targets: [
        { config: metricsConfig, output: 'github-profile.svg' },
        { config: languagesConfig, output: 'github-languages.svg' },
        { config: changesConfig, output: 'assets/activity.svg' },
      ],
    });

    const [mainPath, languagesPath, activityPath] = result.svgPaths;
    const main = readFileSync(mainPath ?? '', 'utf8');
    const languages = readFileSync(languagesPath ?? '', 'utf8');
    const activity = readFileSync(activityPath ?? '', 'utf8');

    expect(fetchProfileStats).toHaveBeenCalledTimes(1);
    expect(result.svgPaths).toEqual([
      join(cwd, 'github-profile.svg'),
      join(cwd, 'github-languages.svg'),
      join(cwd, 'assets/activity.svg'),
    ]);
    expect(main).toContain('fill="#300a24"');
    expect(main).toContain('<animate');
    expect(languages).toContain('fill="#000000"');
    expect(languages).toContain('fill="freeze"');
    expect(activity).toContain('fill="#1c1c1e"');
    expect(activity).not.toContain('<animate');
    expect(activity).toContain('code changes');
    expect(activity).not.toContain('top languages');
    expect(activity).not.toContain('repos');
  });

  it('passes the same ProfileStats snapshot to every render', async () => {
    const cwd = tempDir();
    const snapshot = { ...completeStats, repos: 99, stars: 7 };
    const fetchProfileStats = vi.fn(() => Promise.resolve(snapshot));
    const render = vi.fn(renderProfileSvg);

    await generate({
      cwd,
      fetchProfileStats,
      renderProfileSvg: render,
      targets: [
        { config: metricsConfig, output: 'a.svg' },
        { config: languagesConfig, output: 'b.svg' },
      ],
    });

    expect(fetchProfileStats).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(2);
    expect(render.mock.calls[0]?.[0]).toBe(snapshot);
    expect(render.mock.calls[1]?.[0]).toBe(snapshot);
    expect(readFileSync(join(cwd, 'a.svg'), 'utf8')).toContain('99');
    expect(readFileSync(join(cwd, 'a.svg'), 'utf8')).toContain('7');
  });

  it('fails on an empty target list before fetching', async () => {
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));

    await expect(
      generate({
        cwd: tempDir(),
        fetchProfileStats,
        targets: [],
      }),
    ).rejects.toThrow('At least one render target is required.');

    expect(fetchProfileStats).not.toHaveBeenCalled();
  });

  it('fails on duplicate output paths before fetching', async () => {
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));

    await expect(
      generate({
        cwd: tempDir(),
        fetchProfileStats,
        targets: [
          { config: metricsConfig, output: 'github-profile.svg' },
          { config: languagesConfig, output: './github-profile.svg' },
        ],
      }),
    ).rejects.toThrow('Duplicate output path: ./github-profile.svg');

    expect(fetchProfileStats).not.toHaveBeenCalled();
  });

  it('identifies the failed output when rendering throws', async () => {
    const cwd = tempDir();
    const fetchProfileStats = vi.fn(() => Promise.resolve(completeStats));
    const render = vi.fn((stats: ProfileStats, config: ProfileConfig) => {
      if (config.theme === 'matrix') {
        throw new Error('boom');
      }

      return renderProfileSvg(stats, config);
    });

    await expect(
      generate({
        cwd,
        fetchProfileStats,
        renderProfileSvg: render,
        targets: [
          { config: metricsConfig, output: 'github-profile.svg' },
          { config: languagesConfig, output: 'github-languages.svg' },
        ],
      }),
    ).rejects.toThrow('Unable to render github-languages.svg: boom');

    expect(readFileSync(join(cwd, 'github-profile.svg'), 'utf8')).toContain(
      '<svg',
    );
  });

  it('identifies the failed output when writing throws', async () => {
    const cwd = tempDir();
    writeFileSync(join(cwd, 'blocked'), 'not a directory\n');

    await expect(
      generate({
        cwd,
        targets: [
          { config: metricsConfig, output: 'github-profile.svg' },
          { config: languagesConfig, output: 'blocked/github-languages.svg' },
        ],
      }),
    ).rejects.toThrow(/Unable to write SVG to: blocked\/github-languages.svg/);

    expect(readFileSync(join(cwd, 'github-profile.svg'), 'utf8')).toContain(
      '<svg',
    );
  });

  it('still renders every target when code changes are incomplete', async () => {
    const cwd = tempDir();
    const fetchProfileStats = vi.fn(() => Promise.resolve(incompleteStats));

    const result = await generate({
      cwd,
      fetchProfileStats,
      targets: [
        { config: metricsConfig, output: 'github-profile.svg' },
        { config: changesConfig, output: 'assets/activity.svg' },
      ],
    });

    expect(fetchProfileStats).toHaveBeenCalledTimes(1);
    expect(readFileSync(result.svgPaths[0] ?? '', 'utf8')).toContain('<svg');
    expect(readFileSync(result.svgPaths[1] ?? '', 'utf8')).toContain('~120');
  });

  it('is deterministic for the same stats, configs, and order', async () => {
    const cwd = tempDir();
    const first = await generate({
      cwd,
      targets: [
        { config: metricsConfig, output: 'one/main.svg' },
        { config: languagesConfig, output: 'one/languages.svg' },
      ],
    });
    const second = await generate({
      cwd,
      targets: [
        { config: metricsConfig, output: 'two/main.svg' },
        { config: languagesConfig, output: 'two/languages.svg' },
      ],
    });

    expect(readFileSync(first.svgPaths[0] ?? '', 'utf8')).toBe(
      readFileSync(second.svgPaths[0] ?? '', 'utf8'),
    );
    expect(readFileSync(first.svgPaths[1] ?? '', 'utf8')).toBe(
      readFileSync(second.svgPaths[1] ?? '', 'utf8'),
    );
  });
});
