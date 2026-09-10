import { resolve } from 'node:path';

import { parseProfileConfig } from '@github-profile-sh/core/config';
import { ExpectedError } from '@github-profile-sh/core/errors';
import type {
  createGitHubClient,
  GitHubClient,
  ProfileStats,
} from '@github-profile-sh/core/github';

import { generateProfileOutputs } from './generate-outputs.js';
import { readTextFile } from './read-file.js';

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
  const log = options.log ?? (() => undefined);

  log('Reading configuration...');
  const config = parseProfileConfig(
    await readTextFile(configPath, options.configPath, {
      missingPrefix: 'Configuration file not found',
      readPrefix: 'Unable to read configuration file',
    }),
    { path: options.configPath },
  );

  const result = await generateProfileOutputs({
    token: options.token,
    username: options.username,
    today: options.today,
    targets: [{ config, output: options.outputPath }],
    cwd,
    createGitHubClient: options.createGitHubClient,
    fetchProfileStats: options.fetchProfileStats,
    log,
  });

  const svgPath = result.svgPaths[0];

  if (svgPath === undefined) {
    throw new ExpectedError('At least one render target is required.');
  }

  return { svgPath };
}
