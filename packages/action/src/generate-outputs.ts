import { resolve } from 'node:path';

import type { ProfileConfig } from '@github-profile-sh/core/config/schema';
import { ExpectedError, getErrorMessage } from '@github-profile-sh/core/errors';
import {
  createGitHubClient,
  fetchProfileStats,
  wrapGitHubError,
  type GitHubClient,
  type ProfileStats,
} from '@github-profile-sh/core/github';

import { renderProfileSvg } from './render.js';
import { writeSvgFile } from './write-svg.js';

export type RenderTarget = {
  config: ProfileConfig;
  output: string;
};

export type GenerateProfileOutputsOptions = {
  token: string;
  username: string;
  today: string;
  targets: RenderTarget[];
  cwd?: string;
  createGitHubClient?: typeof createGitHubClient;
  fetchProfileStats?: (
    client: GitHubClient,
    username: string,
    options: { today: string },
  ) => Promise<ProfileStats>;
  renderProfileSvg?: typeof renderProfileSvg;
  log?: (message: string) => void;
};

export type GenerateProfileOutputsResult = {
  svgPaths: string[];
};

export async function generateProfileOutputs(
  options: GenerateProfileOutputsOptions,
): Promise<GenerateProfileOutputsResult> {
  const cwd = options.cwd ?? process.cwd();
  const targets = options.targets;
  const log = options.log ?? (() => undefined);

  if (targets.length === 0) {
    throw new ExpectedError('At least one render target is required.');
  }

  assertUniqueOutputPaths(targets, cwd);

  if (options.token.trim() === '') {
    throw new ExpectedError('GitHub token is required.');
  }

  if (options.username.trim() === '') {
    throw new ExpectedError('Unable to resolve GitHub username.');
  }

  const createClient = options.createGitHubClient ?? createGitHubClient;
  const fetchStats = options.fetchProfileStats ?? fetchProfileStats;
  const render = options.renderProfileSvg ?? renderProfileSvg;

  log('Fetching public profile data...');
  const client = createClient({ token: options.token });
  const stats = await fetchPublicStats(
    fetchStats,
    client,
    options.username,
    options.today,
  );

  const svgPaths: string[] = [];

  for (const target of targets) {
    const svgPath = resolve(cwd, target.output);
    log('Generating SVG...');
    const svg = renderTargetSvg(render, stats, target);
    await writeSvgFile(svgPath, svg, target.output);
    log(`Profile generated: ${target.output}`);
    svgPaths.push(svgPath);
  }

  return { svgPaths };
}

function assertUniqueOutputPaths(
  targets: readonly RenderTarget[],
  cwd: string,
): void {
  const seen = new Set<string>();

  for (const target of targets) {
    const resolved = resolve(cwd, target.output);

    if (seen.has(resolved)) {
      throw new ExpectedError(`Duplicate output path: ${target.output}`);
    }

    seen.add(resolved);
  }
}

function renderTargetSvg(
  render: typeof renderProfileSvg,
  stats: ProfileStats,
  target: RenderTarget,
): string {
  try {
    return render(stats, target.config);
  } catch (error) {
    throw new ExpectedError(
      `Unable to render ${target.output}: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}

async function fetchPublicStats(
  fetchStats: NonNullable<GenerateProfileOutputsOptions['fetchProfileStats']>,
  client: GitHubClient,
  username: string,
  today: string,
): Promise<ProfileStats> {
  try {
    return await fetchStats(client, username, { today });
  } catch (error) {
    throw wrapGitHubError(error);
  }
}
