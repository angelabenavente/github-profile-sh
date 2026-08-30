import { stringify } from 'yaml';

import type { ProfileConfig } from './schema.js';

export function serializeProfileConfig(config: ProfileConfig): string {
  const yaml = stringify(
    {
      sections: {
        repos: config.sections.repos,
        stars: config.sections.stars,
        streak: config.sections.streak,
        codeChanges: config.sections.codeChanges,
        languages: config.sections.languages,
      },
      theme: config.theme,
      animation: {
        enabled: config.animation.enabled,
        mode: config.animation.mode,
      },
      update: {
        frequency: config.update.frequency,
      },
    },
    {
      indent: 2,
      collectionStyle: 'block',
      lineWidth: 0,
      simpleKeys: true,
    },
  );

  return ensureTrailingNewline(separateTopLevelKeys(yaml));
}

function separateTopLevelKeys(yaml: string): string {
  const lines = yaml.replace(/\n$/, '').split('\n');
  const spaced: string[] = [];

  for (const line of lines) {
    if (spaced.length > 0 && line !== '' && !line.startsWith(' ')) {
      spaced.push('');
    }

    spaced.push(line);
  }

  return spaced.join('\n');
}

function ensureTrailingNewline(yaml: string): string {
  return yaml.endsWith('\n') ? yaml : `${yaml}\n`;
}
