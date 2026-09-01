import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const node = process.execPath;
const tsRunner = [
  '--experimental-strip-types',
  '--import',
  './scripts/register-ts.mjs',
];

function run(command: string, args: string[]): void {
  process.stdout.write(`\n→ ${command} ${args.join(' ')}\n`);

  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('pnpm', ['lint']);
run('pnpm', ['format:check']);
run('pnpm', ['typecheck']);
run('pnpm', ['build:cli']);
run('pnpm', ['test:run']);
run(node, [...tsRunner, 'scripts/release/check-action-bundle.ts']);
run(node, [...tsRunner, 'scripts/release/pack-cli-smoke.ts']);

process.stdout.write('\nrelease:check passed.\n');
