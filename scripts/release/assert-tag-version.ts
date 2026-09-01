import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { packageVersionFromReleaseTag } from './tag-version.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function readCliPackageVersion(root = repoRoot): string {
  const manifest = JSON.parse(
    readFileSync(join(root, 'packages/cli/package.json'), 'utf8'),
  ) as { version?: string };

  if (manifest.version == null || manifest.version.trim() === '') {
    throw new Error('packages/cli/package.json is missing version.');
  }

  return manifest.version;
}

export function assertTagMatchesCliVersion(
  tag: string,
  packageVersion = readCliPackageVersion(),
): void {
  const expected = packageVersionFromReleaseTag(tag);

  if (expected !== packageVersion) {
    throw new Error(
      `Tag ${tag} does not match CLI package version ${packageVersion}.`,
    );
  }
}

function resolveTag(argv: string[]): string {
  const fromArg = argv[2];
  if (fromArg != null && fromArg.trim() !== '') {
    return fromArg;
  }

  const fromEnv = process.env['GITHUB_REF_NAME'];
  if (fromEnv != null && fromEnv.trim() !== '') {
    return fromEnv;
  }

  throw new Error('Provide a release tag as an argument or GITHUB_REF_NAME.');
}

const invokedDirectly = process.argv.some((argument) =>
  argument
    .replaceAll('\\', '/')
    .endsWith('/scripts/release/assert-tag-version.ts'),
);

if (invokedDirectly) {
  try {
    const tag = resolveTag(process.argv);
    assertTagMatchesCliVersion(tag);
    process.stdout.write(
      `Tag ${tag} matches CLI version ${readCliPackageVersion()}.\n`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
