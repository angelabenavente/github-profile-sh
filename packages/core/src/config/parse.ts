import { YAMLParseError, parse as parseYaml } from 'yaml';
import type { ZodError } from 'zod';

import { ExpectedError } from '../errors.js';

import { profileConfigSchema, type ProfileConfig } from './schema.js';

export type ParseProfileConfigOptions = {
  path?: string;
};

export function parseProfileConfig(
  yaml: string,
  options: ParseProfileConfigOptions = {},
): ProfileConfig {
  const value = parseYamlValue(yaml, options.path);
  const result = profileConfigSchema.safeParse(value);

  if (!result.success) {
    throw new ExpectedError(
      formatLocatedMessage(
        'Invalid profile config',
        options.path,
        formatConfigIssues(result.error),
      ),
    );
  }

  return result.data;
}

function parseYamlValue(yaml: string, path?: string): unknown {
  if (yaml.trim() === '') {
    return {};
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

  if (value == null) {
    return {};
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

function formatConfigIssues(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.') || 'config';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
