import { cac } from 'cac';

import { runInit } from './commands/init.js';

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

export function createCli() {
  const cli = cac('github-profile-sh');

  cli.usage('[command]');
  cli.help((sections) => {
    sections.splice(1, 0, {
      body: 'Animated GitHub profile stats rendered as a terminal.',
    });
    return sections;
  });
  cli.version('0.1.0');
  cli.command('init', 'Configure github-profile.sh').action(() => {
    runInit();
  });

  return cli;
}

function isExpectedCliError(error: unknown): error is Error {
  return (
    error instanceof UsageError ||
    (error instanceof Error && error.name === 'CACError')
  );
}

export function run(argv: string[] = process.argv): number {
  const cli = createCli();

  try {
    cli.parse(argv);

    const unknown = cli.args[0];
    if (cli.matchedCommandName == null && unknown !== undefined) {
      throw new UsageError(`Unknown command: ${unknown}`);
    }

    return 0;
  } catch (error) {
    if (isExpectedCliError(error)) {
      console.error(error.message);
      return 1;
    }

    throw error;
  }
}
