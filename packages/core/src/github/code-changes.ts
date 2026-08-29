import type {
  CodeChanges,
  PublicRepository,
  RepositoryCodeChanges,
} from './types.js';
import { normalizeGitHubUsername } from './username.js';

const defaultMaxRetries = 2;
const defaultRetryDelayMs = 200;

type GitHubCodeChangesClient = {
  rest: {
    repos: {
      getContributorsStats: (params: {
        owner: string;
        repo: string;
      }) => Promise<{
        status: number;
        data: unknown;
      }>;
    };
  };
};

type RepositoryRef = Pick<PublicRepository, 'fullName'>;

export type FetchCodeChangesOptions = {
  sleep?: (ms: number) => Promise<void>;
  retryDelayMs?: number;
  maxRetries?: number;
};

type ContributorTotals = {
  login: string;
  additions: number;
  deletions: number;
};

function ownerAndRepo(fullName: string): { owner: string; repo: string } {
  const separator = fullName.indexOf('/');

  return {
    owner: fullName.slice(0, separator),
    repo: fullName.slice(separator + 1),
  };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const globalObject = globalThis as typeof globalThis & {
      setTimeout: (callback: () => void, delay: number) => unknown;
    };

    globalObject.setTimeout(resolve, ms);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function httpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined;
  }

  return typeof error.status === 'number' ? error.status : undefined;
}

function sameGitHubLogin(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function weekNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function parseContributorTotals(
  data: unknown,
): ContributorTotals[] | undefined {
  if (!Array.isArray(data)) {
    return undefined;
  }

  const totals: ContributorTotals[] = [];

  for (const entry of data) {
    if (!isRecord(entry)) {
      continue;
    }

    const author = entry.author;
    const login =
      isRecord(author) && typeof author.login === 'string'
        ? author.login
        : undefined;

    if (login === undefined) {
      continue;
    }

    const weeks = Array.isArray(entry.weeks) ? entry.weeks : [];
    let additions = 0;
    let deletions = 0;

    for (const week of weeks) {
      if (!isRecord(week)) {
        return undefined;
      }

      const weekAdditions = weekNumber(week.a);
      const weekDeletions = weekNumber(week.d);

      if (weekAdditions === undefined || weekDeletions === undefined) {
        return undefined;
      }

      additions += weekAdditions;
      deletions += weekDeletions;
    }

    totals.push({ login, additions, deletions });
  }

  return totals;
}

function countedChanges(
  additions: number,
  deletions: number,
): RepositoryCodeChanges {
  return {
    additions,
    deletions,
    counted: true,
  };
}

function skippedRepository(): RepositoryCodeChanges {
  return {
    additions: 0,
    deletions: 0,
    counted: false,
  };
}

function changesForUsername(
  contributors: ContributorTotals[],
  username: string,
): RepositoryCodeChanges {
  const contributor = contributors.find((entry) =>
    sameGitHubLogin(entry.login, username),
  );

  if (contributor === undefined) {
    return countedChanges(0, 0);
  }

  return countedChanges(contributor.additions, contributor.deletions);
}

async function requestContributorStats(
  client: GitHubCodeChangesClient,
  owner: string,
  repo: string,
  options: Required<
    Pick<FetchCodeChangesOptions, 'sleep' | 'retryDelayMs' | 'maxRetries'>
  >,
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    try {
      const response = await client.rest.repos.getContributorsStats({
        owner,
        repo,
      });

      if (response.status === 202) {
        if (attempt < options.maxRetries) {
          await options.sleep(options.retryDelayMs);
        }

        continue;
      }

      return { ok: true, data: response.data };
    } catch (error) {
      const status = httpStatus(error);

      if (status === 202) {
        if (attempt < options.maxRetries) {
          await options.sleep(options.retryDelayMs);
        }

        continue;
      }

      if (status === 401) {
        throw error;
      }

      if (status !== undefined) {
        return { ok: false };
      }

      throw error;
    }
  }

  return { ok: false };
}

export function calculateCodeChanges(
  repositories: readonly {
    additions: number;
    deletions: number;
    counted?: boolean;
  }[],
): CodeChanges {
  let additions = 0;
  let deletions = 0;
  let repositoriesProcessed = 0;
  let repositoriesSkipped = 0;

  for (const repository of repositories) {
    const counted = repository.counted !== false;

    if (!counted) {
      repositoriesSkipped += 1;
      continue;
    }

    additions += repository.additions;
    deletions += repository.deletions;
    repositoriesProcessed += 1;
  }

  return {
    additions,
    deletions,
    total: additions + deletions,
    complete: repositoriesSkipped === 0,
    repositoriesProcessed,
    repositoriesSkipped,
  };
}

export async function fetchRepositoryCodeChanges(
  client: GitHubCodeChangesClient,
  repository: RepositoryRef,
  username: string,
  options: FetchCodeChangesOptions = {},
): Promise<RepositoryCodeChanges> {
  const normalizedUsername = normalizeGitHubUsername(username);
  const { owner, repo } = ownerAndRepo(repository.fullName);
  const response = await requestContributorStats(client, owner, repo, {
    sleep: options.sleep ?? defaultSleep,
    retryDelayMs: options.retryDelayMs ?? defaultRetryDelayMs,
    maxRetries: options.maxRetries ?? defaultMaxRetries,
  });

  if (!response.ok) {
    return skippedRepository();
  }

  const contributors = parseContributorTotals(response.data);

  if (contributors === undefined) {
    return skippedRepository();
  }

  return changesForUsername(contributors, normalizedUsername);
}

export async function fetchRepositoriesCodeChanges(
  client: GitHubCodeChangesClient,
  repositories: readonly RepositoryRef[],
  username: string,
  options: FetchCodeChangesOptions = {},
): Promise<CodeChanges> {
  const results: RepositoryCodeChanges[] = [];

  for (const repository of repositories) {
    results.push(
      await fetchRepositoryCodeChanges(client, repository, username, options),
    );
  }

  return calculateCodeChanges(results);
}
