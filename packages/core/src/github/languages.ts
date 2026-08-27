import type {
  LanguageStat,
  PublicRepository,
  RepositoryLanguages,
} from './types.js';

const defaultTopLanguageCount = 3;

type GitHubLanguagesClient = {
  rest: {
    repos: {
      listLanguages: (params: {
        owner: string;
        repo: string;
      }) => Promise<{ data: RepositoryLanguages }>;
    };
  };
};

type RepositoryRef = Pick<PublicRepository, 'fullName'>;

function ownerAndRepo(fullName: string): { owner: string; repo: string } {
  const separator = fullName.indexOf('/');

  return {
    owner: fullName.slice(0, separator),
    repo: fullName.slice(separator + 1),
  };
}

export async function fetchRepositoryLanguages(
  client: GitHubLanguagesClient,
  repository: RepositoryRef,
): Promise<RepositoryLanguages> {
  const { owner, repo } = ownerAndRepo(repository.fullName);
  const { data } = await client.rest.repos.listLanguages({ owner, repo });

  return data;
}

export async function fetchRepositoriesLanguages(
  client: GitHubLanguagesClient,
  repositories: readonly RepositoryRef[],
): Promise<RepositoryLanguages[]> {
  const languages: RepositoryLanguages[] = [];

  for (const repository of repositories) {
    languages.push(await fetchRepositoryLanguages(client, repository));
  }

  return languages;
}

export function aggregateLanguages(
  languageMaps: readonly RepositoryLanguages[],
): LanguageStat[] {
  const bytesByName = new Map<string, number>();

  for (const languageMap of languageMaps) {
    for (const [name, bytes] of Object.entries(languageMap)) {
      bytesByName.set(name, (bytesByName.get(name) ?? 0) + bytes);
    }
  }

  const totalBytes = [...bytesByName.values()].reduce(
    (total, bytes) => total + bytes,
    0,
  );

  return [...bytesByName.entries()]
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: totalBytes === 0 ? 0 : (bytes / totalBytes) * 100,
    }))
    .sort((left, right) => {
      if (right.bytes !== left.bytes) {
        return right.bytes - left.bytes;
      }

      return left.name.localeCompare(right.name);
    });
}

export function calculateTopLanguages(
  languageMaps: readonly RepositoryLanguages[],
  limit = defaultTopLanguageCount,
): LanguageStat[] {
  return aggregateLanguages(languageMaps).slice(0, limit);
}
