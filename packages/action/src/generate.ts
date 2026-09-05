import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { createAnimationTimeline } from '@github-profile-sh/core/animation';
import { parseProfileConfig } from '@github-profile-sh/core/config';
import {
  ExpectedError,
  getErrorMessage,
  isExpectedError,
} from '@github-profile-sh/core/errors';
import {
  createGitHubClient,
  fetchProfileStats,
  wrapGitHubError,
  type GitHubClient,
  type ProfileStats,
} from '@github-profile-sh/core/github';
import { renderTerminalSvg } from '@github-profile-sh/core/renderer';
import { buildTerminalOutput } from '@github-profile-sh/core/terminal';

export type GenerateProfileOptions = {
  configPath: string;
  outputPath: string;
  token: string;
  username: string;
  today: string;
  cwd?: string;
  createGitHubClient?: typeof createGitHubClient;
  fetchProfileStats?: (
    client: GitHubClient,
    username: string,
    options: { today: string },
  ) => Promise<ProfileStats>;
  log?: (message: string) => void;
};

export type GenerateProfileResult = {
  svgPath: string;
};

export async function generateProfile(
  options: GenerateProfileOptions,
): Promise<GenerateProfileResult> {
  if (options.token.trim() === '') {
    throw new ExpectedError('GitHub token is required.');
  }

  if (options.username.trim() === '') {
    throw new ExpectedError('Unable to resolve GitHub username.');
  }

  const cwd = options.cwd ?? process.cwd();
  const configPath = resolve(cwd, options.configPath);
  const svgPath = resolve(cwd, options.outputPath);
  const log = options.log ?? (() => undefined);
  const createClient = options.createGitHubClient ?? createGitHubClient;
  const fetchStats = options.fetchProfileStats ?? fetchProfileStats;

  log('Reading configuration...');
  const config = parseProfileConfig(
    await readConfigFile(configPath, options.configPath),
    { path: options.configPath },
  );

  log('Fetching public profile data...');
  const client = createClient({ token: options.token });
  const stats = await fetchPublicStats(
    fetchStats,
    client,
    options.username,
    options.today,
  );

  log('Generating SVG...');
  const svg = renderProfileSvg(stats, config);

  await writeSvgFile(svgPath, svg, options.outputPath);
  log(`Profile generated: ${options.outputPath}`);

  return { svgPath };
}

async function fetchPublicStats(
  fetchStats: NonNullable<GenerateProfileOptions['fetchProfileStats']>,
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

function renderProfileSvg(
  stats: ProfileStats,
  config: ReturnType<typeof parseProfileConfig>,
): string {
  try {
    const terminal = buildTerminalOutput(stats, config);
    return renderTerminalSvg(terminal, {
      timeline: createAnimationTimeline(terminal, config.animation),
      theme: config.theme,
    });
  } catch (error) {
    if (isExpectedError(error)) {
      throw error;
    }

    throw new ExpectedError(
      `Unable to render profile SVG: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}

async function writeSvgFile(
  absolutePath: string,
  svg: string,
  requestedPath: string,
): Promise<void> {
  try {
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, svg, { encoding: 'utf8' });
  } catch (error) {
    throw new ExpectedError(
      `Unable to write SVG to: ${requestedPath}: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}

async function readConfigFile(
  absolutePath: string,
  requestedPath: string,
): Promise<string> {
  try {
    return await readFile(absolutePath, { encoding: 'utf8' });
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new ExpectedError(
        `Configuration file not found: ${requestedPath}`,
        {
          cause: error,
        },
      );
    }

    throw new ExpectedError(
      `Unable to read configuration file: ${requestedPath}: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
