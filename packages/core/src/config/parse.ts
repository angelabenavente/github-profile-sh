import { YAMLParseError, parse as parseYaml } from 'yaml';
import type { ZodError } from 'zod';

import { profileConfigSchema, type ProfileConfig } from './schema.js';

export function parseProfileConfig(yaml: string): ProfileConfig {
  const value = parseYamlValue(yaml);
  const result = profileConfigSchema.safeParse(value);

  if (!result.success) {
    throw new Error(
      `Invalid profile config: ${formatConfigIssues(result.error)}`,
    );
  }

  return result.data;
}

function parseYamlValue(yaml: string): unknown {
  if (yaml.trim() === '') {
    return {};
  }

  let value: unknown;

  try {
    value = parseYaml(yaml);
  } catch (error) {
    if (error instanceof YAMLParseError) {
      throw new Error(`Invalid YAML: ${error.message}`, { cause: error });
    }

    throw error;
  }

  if (value == null) {
    return {};
  }

  return value;
}

function formatConfigIssues(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.') || 'config';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
