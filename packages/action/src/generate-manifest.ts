import { resolve } from 'node:path';

import { parseProfileConfig } from '@github-profile-sh/core/config';
import { ExpectedError } from '@github-profile-sh/core/errors';
import type {
  createGitHubClient,
  GitHubClient,
  ProfileStats,
} from '@github-profile-sh/core/github';

import {
  generateProfileOutputs,
  type RenderTarget,
} from './generate-outputs.js';
import { parseOutputsManifest } from './manifest/index.js';
import { readTextFile } from './read-file.js';

export type GenerateFromManifestOptions = {
  manifestPath: string;
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

export type GenerateFromManifestResult = {
  svgPaths: string[];
  outputs: string[];
};

export async function generateFromManifest(
  options: GenerateFromManifestOptions,
): Promise<GenerateFromManifestResult> {
  if (options.token.trim() === '') {
    throw new ExpectedError('GitHub token is required.');
  }

  if (options.username.trim() === '') {
    throw new ExpectedError('Unable to resolve GitHub username.');
  }

  const cwd = options.cwd ?? process.cwd();
  const log = options.log ?? (() => undefined);
  const manifestPath = resolve(cwd, options.manifestPath);

  log('Reading manifest...');
  const manifest = parseOutputsManifest(
    await readTextFile(manifestPath, options.manifestPath, {
      missingPrefix: 'Manifest file not found',
      readPrefix: 'Unable to read manifest',
    }),
    { path: options.manifestPath },
  );

  log(
    `Loading ${String(manifest.profiles.length)} profile configuration${
      manifest.profiles.length === 1 ? '' : 's'
    }...`,
  );

  const targets: RenderTarget[] = [];

  for (const profile of manifest.profiles) {
    const config = parseProfileConfig(
      await readTextFile(resolve(cwd, profile.config), profile.config, {
        missingPrefix: 'Configuration file not found',
        readPrefix: 'Unable to read configuration file',
      }),
      { path: profile.config },
    );

    targets.push({ config, output: profile.output });
  }

  const result = await generateProfileOutputs({
    token: options.token,
    username: options.username,
    today: options.today,
    targets,
    cwd,
    createGitHubClient: options.createGitHubClient,
    fetchProfileStats: options.fetchProfileStats,
    log,
  });

  return {
    svgPaths: result.svgPaths,
    outputs: manifest.profiles.map((profile) => profile.output),
  };
}
