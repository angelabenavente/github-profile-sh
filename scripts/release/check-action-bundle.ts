import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('pnpm', ['build:action']);

const diff = spawnSync('git', ['diff', '--exit-code', '--', 'dist'], {
  cwd: repoRoot,
  encoding: 'utf8',
});

if (diff.status !== 0) {
  process.stderr.write(
    'dist/ is out of date. Run pnpm build:action and commit the bundle.\n',
  );
  process.exit(1);
}
