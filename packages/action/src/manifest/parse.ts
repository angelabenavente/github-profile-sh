import { YAMLParseError, parse as parseYaml } from 'yaml';
import type { ZodError } from 'zod';

import { ExpectedError } from '@github-profile-sh/core/errors';

import { outputsManifestSchema, type OutputsManifest } from './schema.js';

export type ParseOutputsManifestOptions = {
  path?: string;
};

export function parseOutputsManifest(
  yaml: string,
  options: ParseOutputsManifestOptions = {},
): OutputsManifest {
  const value = parseYamlValue(yaml, options.path);
  const result = outputsManifestSchema.safeParse(value);

  if (!result.success) {
    throw new ExpectedError(
      formatLocatedMessage(
        'Invalid manifest',
        options.path,
        formatManifestIssues(result.error),
      ),
    );
  }

  assertUniqueManifestOutputs(result.data);

  return result.data;
}

function assertUniqueManifestOutputs(manifest: OutputsManifest): void {
  const seen = new Set<string>();

  for (const profile of manifest.profiles) {
    if (seen.has(profile.output)) {
      throw new ExpectedError(
        `Duplicate output path in manifest: ${profile.output}`,
      );
    }

    seen.add(profile.output);
  }
}

function parseYamlValue(yaml: string, path?: string): unknown {
  if (yaml.trim() === '') {
    throw new ExpectedError(
      formatLocatedMessage(
        'Invalid manifest',
        path,
        'profiles must contain at least one profile',
      ),
    );
  }

  let value: unknown;

  try {
    value = parseYaml(yaml);
  } catch (error) {
    if (error instanceof YAMLParseError) {
      throw new ExpectedError(
        formatLocatedMessage('Invalid YAML', path, error.message),
        { cause: error },
      );
    }

    throw error;
  }

  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ExpectedError(
      formatLocatedMessage('Invalid manifest', path, 'root must be an object'),
    );
  }

  return value;
}

function formatLocatedMessage(
  prefix: string,
  path: string | undefined,
  detail: string,
): string {
  return path == null || path.trim() === ''
    ? `${prefix}: ${detail}`
    : `${prefix} in ${path}: ${detail}`;
}

function formatManifestIssues(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.') || 'manifest';
      if (path === 'profiles' && issue.message.includes('at least one')) {
        return 'profiles must contain at least one profile';
      }

      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
