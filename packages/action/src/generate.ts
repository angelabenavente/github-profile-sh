import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { createAnimationTimeline } from '@github-profile-sh/core/animation';
import { parseProfileConfig } from '@github-profile-sh/core/config';
import {
  createGitHubClient,
  fetchProfileStats,
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
  const cwd = options.cwd ?? process.cwd();
  const configPath = resolve(cwd, options.configPath);
  const svgPath = resolve(cwd, options.outputPath);
  const log = options.log ?? (() => undefined);
  const createClient = options.createGitHubClient ?? createGitHubClient;
  const fetchStats = options.fetchProfileStats ?? fetchProfileStats;

  log('Reading configuration...');
  const config = parseProfileConfig(
    await readConfigFile(configPath, options.configPath),
  );

  log('Fetching public profile data...');
  const client = createClient({ token: options.token });
  const stats = await fetchStats(client, options.username, {
    today: options.today,
  });

  log('Generating SVG...');
  const terminal = buildTerminalOutput(stats, config);
  const svg = renderTerminalSvg(terminal, {
    timeline: createAnimationTimeline(terminal, config.animation),
  });

  await mkdir(dirname(svgPath), { recursive: true });
  await writeFile(svgPath, svg, { encoding: 'utf8' });
  log(`Profile generated: ${options.outputPath}`);

  return { svgPath };
}

async function readConfigFile(
  absolutePath: string,
  requestedPath: string,
): Promise<string> {
  try {
    return await readFile(absolutePath, { encoding: 'utf8' });
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      throw new Error(`Configuration file not found: ${requestedPath}`, {
        cause: error,
      });
    }

    throw error;
  }
}
