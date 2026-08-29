import type { ProfileConfig } from '../config/schema.js';
import type { ProfileStats } from '../github/types.js';

import {
  formatCodeChanges,
  formatCompactNumber,
  formatStreak,
} from './format.js';
import type { TerminalLine, TerminalOutput } from './types.js';

const commandLine = {
  type: 'command',
  prompt: '$',
  text: 'github-profile.sh',
} as const;

const statusLine = {
  type: 'status',
  text: 'fetching public profile data...',
} as const;

const finalPrompt = {
  type: 'prompt',
  prompt: '$',
} as const;

const blankLine = {
  type: 'blank',
} as const;

export function buildTerminalOutput(
  stats: ProfileStats,
  config: ProfileConfig,
): TerminalOutput {
  const lines: TerminalLine[] = [commandLine, statusLine];
  const metrics: TerminalLine[] = [];

  if (config.sections.repos) {
    metrics.push({
      type: 'metric',
      label: 'repos',
      value: formatCompactNumber(stats.repos),
    });
  }

  if (config.sections.stars) {
    metrics.push({
      type: 'metric',
      label: 'stars',
      value: formatCompactNumber(stats.stars),
    });
  }

  if (config.sections.streak) {
    metrics.push({
      type: 'metric',
      label: 'current streak',
      value: formatStreak(stats.currentStreak),
    });
  }

  if (config.sections.codeChanges) {
    metrics.push({
      type: 'metric',
      label: 'code changes',
      value: formatCodeChanges(
        stats.codeChanges.total,
        stats.codeChanges.complete,
      ),
    });
  }

  if (metrics.length > 0) {
    lines.push(blankLine, ...metrics);
  }

  if (config.sections.languages && stats.topLanguages.length > 0) {
    lines.push(blankLine, { type: 'heading', text: 'top languages' });

    for (const language of stats.topLanguages) {
      lines.push({
        type: 'language',
        name: language.name,
        percentage: Math.round(language.percentage),
      });
    }
  }

  lines.push(blankLine, finalPrompt);

  return { lines };
}
