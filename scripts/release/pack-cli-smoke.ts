import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const cliRoot = join(repoRoot, 'packages/cli');

function run(
  command: string,
  args: string[],
  cwd: string,
): { stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed.`);
  }

  return { stdout: result.stdout, stderr: result.stderr };
}

const packDir = mkdtempSync(join(tmpdir(), 'github-profile-sh-pack-'));
const smokeDir = mkdtempSync(join(tmpdir(), 'github-profile-sh-smoke-'));

try {
  run('npm', ['pack', `--pack-destination=${packDir}`], cliRoot);

  const manifest = JSON.parse(
    readFileSync(join(cliRoot, 'package.json'), 'utf8'),
  ) as { name: string; version: string };
  const packed = join(packDir, `${manifest.name}-${manifest.version}.tgz`);

  run('npm', ['init', '-y'], smokeDir);
  run('npm', ['install', packed], smokeDir);

  const help = run(
    'npx',
    ['--no-install', 'github-profile-sh', '--help'],
    smokeDir,
  );

  if (
    !help.stdout.includes('github-profile-sh') ||
    !help.stdout.includes('init')
  ) {
    throw new Error('Isolated CLI --help did not print the expected usage.');
  }

  const bundle = readFileSync(
    join(smokeDir, 'node_modules/github-profile-sh/dist/index.js'),
    'utf8',
  );

  if (bundle.includes('workspace:*')) {
    throw new Error('Isolated CLI bundle still contains workspace:*.');
  }

  const license = readFileSync(
    join(smokeDir, 'node_modules/github-profile-sh/LICENSE'),
    'utf8',
  );

  if (!license.includes('MIT License') || !license.includes('CC BY 4.0')) {
    throw new Error('Isolated CLI tarball is missing the expected LICENSE.');
  }

  process.stdout.write(`CLI tarball smoke passed: ${packed}\n`);
} finally {
  rmSync(packDir, { recursive: true, force: true });
  rmSync(smokeDir, { recursive: true, force: true });
}
