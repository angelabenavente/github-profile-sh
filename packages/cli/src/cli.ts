import { cac } from 'cac';

import { runInit } from './commands/init.js';
import { NonInteractiveError, SetupCancelledError } from './wizard/prompt.js';

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

export function createCli(init: () => void | Promise<void> = runInit) {
  const cli = cac('github-profile-sh');

  cli.usage('[command]');
  cli.help((sections) => {
    sections.splice(1, 0, {
      body: 'Animated GitHub profile stats rendered as a terminal.',
    });
    return sections;
  });
  cli.version('0.1.0');
  cli.command('init', 'Configure github-profile.sh').action(async () => {
    await init();
  });

  return cli;
}

function isExpectedCliError(error: unknown): error is Error {
  return (
    error instanceof UsageError ||
    error instanceof SetupCancelledError ||
    error instanceof NonInteractiveError ||
    (error instanceof Error && error.name === 'CACError')
  );
}

export async function run(
  argv: string[] = process.argv,
  init: () => void | Promise<void> = runInit,
): Promise<number> {
  const cli = createCli(init);

  try {
    cli.parse(argv, { run: false });

    const unknown = cli.args[0];
    if (cli.matchedCommandName == null && unknown !== undefined) {
      throw new UsageError(`Unknown command: ${unknown}`);
    }

    await cli.runMatchedCommand();
    return 0;
  } catch (error) {
    if (error instanceof SetupCancelledError) {
      process.stdout.write('Setup cancelled.\n');
      return 1;
    }

    if (isExpectedCliError(error)) {
      console.error(error.message);
      return 1;
    }

    throw error;
  }
}
