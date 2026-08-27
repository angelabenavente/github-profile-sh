import type { PublicRepository } from './types.js';
import { normalizeGitHubUsername } from './username.js';

type GitHubRepositoryResponse = {
  name: string;
  full_name: string;
  stargazers_count?: number;
  forks_count?: number;
  language?: string | null;
  fork?: boolean;
  archived?: boolean;
  html_url: string;
};

type ListForUser = (params: {
  username: string;
  per_page?: number;
  type?: 'all' | 'owner' | 'member';
}) => Promise<{ data: GitHubRepositoryResponse[] }>;

type GitHubRepositoriesClient = {
  paginate: (
    endpoint: ListForUser,
    params: {
      username: string;
      per_page: number;
      type: 'owner';
    },
  ) => Promise<GitHubRepositoryResponse[]>;
  rest: {
    repos: {
      listForUser: ListForUser;
    };
  };
};

function toPublicRepository(repo: GitHubRepositoryResponse): PublicRepository {
  return {
    name: repo.name,
    fullName: repo.full_name,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    language: repo.language ?? null,
    isFork: repo.fork ?? false,
    archived: repo.archived ?? false,
    repoUrl: repo.html_url,
  };
}

export async function fetchPublicRepositories(
  client: GitHubRepositoriesClient,
  username: string,
): Promise<PublicRepository[]> {
  const normalizedUsername = normalizeGitHubUsername(username);

  const repositories = await client.paginate(client.rest.repos.listForUser, {
    username: normalizedUsername,
    per_page: 100,
    type: 'owner',
  });

  return repositories.map(toPublicRepository);
}

// v0.1: every public owned repo counts, including forks.
export function calculateTotalStars(
  repositories: readonly PublicRepository[],
): number {
  return repositories.reduce(
    (total, repository) => total + repository.stars,
    0,
  );
}
