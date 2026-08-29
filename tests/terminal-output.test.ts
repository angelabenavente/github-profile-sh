import { describe, expect, it } from 'vitest';

import {
  defaultProfileConfig,
  type ProfileConfig,
} from '../packages/core/src/config/index.js';
import type { ProfileStats } from '../packages/core/src/github/index.js';
import {
  buildTerminalOutput,
  formatCompactNumber,
  formatMetricLine,
  type TerminalLine,
} from '../packages/core/src/terminal/index.js';

const completeStats: ProfileStats = {
  username: 'octocat',
  repos: 42,
  stars: 1800,
  currentStreak: 21,
  codeChanges: {
    additions: 6000,
    deletions: 2429,
    total: 8429,
    complete: true,
  },
  topLanguages: [
    { name: 'TypeScript', bytes: 62000, percentage: 62 },
    { name: 'Rust', bytes: 25000, percentage: 25 },
    { name: 'Go', bytes: 13000, percentage: 13 },
  ],
};

function withSections(
  sections: Partial<ProfileConfig['sections']>,
): ProfileConfig {
  return {
    ...defaultProfileConfig,
    sections: {
      ...defaultProfileConfig.sections,
      ...sections,
    },
  };
}

function linesOfType<T extends TerminalLine['type']>(
  lines: TerminalLine[],
  type: T,
) {
  return lines.filter(
    (line): line is Extract<TerminalLine, { type: T }> => line.type === type,
  );
}

describe('formatCompactNumber', () => {
  it('keeps numbers below 1000 as integers', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(42)).toBe('42');
    expect(formatCompactNumber(999)).toBe('999');
  });

  it('formats thousands compactly', () => {
    expect(formatCompactNumber(1000)).toBe('1k');
    expect(formatCompactNumber(1800)).toBe('1.8k');
    expect(formatCompactNumber(8429)).toBe('8.4k');
  });

  it('formats millions compactly', () => {
    expect(formatCompactNumber(1_000_000)).toBe('1m');
    expect(formatCompactNumber(1_800_000)).toBe('1.8m');
  });
});

describe('formatMetricLine', () => {
  it('aligns values to a shared column', () => {
    const width = 32;
    const lines = [
      formatMetricLine('repos', '42', width),
      formatMetricLine('stars', '1.8k', width),
      formatMetricLine('current streak', '21 days', width),
      formatMetricLine('code changes', '8.4k', width),
    ];

    expect(lines).toEqual([
      'repos.........................42',
      'stars.......................1.8k',
      'current streak...........21 days',
      'code changes................8.4k',
    ]);
    expect(lines.every((line) => line.length === width)).toBe(true);
  });
});

describe('buildTerminalOutput', () => {
  it('builds the complete v0.1 output', () => {
    const { lines } = buildTerminalOutput(completeStats, defaultProfileConfig);

    expect(lines).toEqual([
      {
        type: 'command',
        prompt: '$',
        text: 'github-profile.sh',
      },
      {
        type: 'status',
        text: 'fetching public profile data...',
      },
      { type: 'blank' },
      { type: 'metric', label: 'repos', value: '42' },
      { type: 'metric', label: 'stars', value: '1.8k' },
      { type: 'metric', label: 'current streak', value: '21 days' },
      { type: 'metric', label: 'code changes', value: '8.4k' },
      { type: 'blank' },
      { type: 'heading', text: 'top languages' },
      { type: 'language', name: 'TypeScript', percentage: 62 },
      { type: 'language', name: 'Rust', percentage: 25 },
      { type: 'language', name: 'Go', percentage: 13 },
      { type: 'blank' },
      { type: 'prompt', prompt: '$' },
    ]);
  });

  it('omits a disabled section', () => {
    const { lines } = buildTerminalOutput(
      completeStats,
      withSections({ stars: false }),
    );

    expect(linesOfType(lines, 'metric').map((line) => line.label)).toEqual([
      'repos',
      'current streak',
      'code changes',
    ]);
  });

  it('omits every disabled section', () => {
    const { lines } = buildTerminalOutput(
      completeStats,
      withSections({
        repos: false,
        stars: false,
        streak: false,
        codeChanges: false,
        languages: false,
      }),
    );

    expect(lines).toEqual([
      {
        type: 'command',
        prompt: '$',
        text: 'github-profile.sh',
      },
      {
        type: 'status',
        text: 'fetching public profile data...',
      },
      { type: 'blank' },
      { type: 'prompt', prompt: '$' },
    ]);
  });

  it('keeps the fixed metric order', () => {
    const { lines } = buildTerminalOutput(completeStats, defaultProfileConfig);

    expect(linesOfType(lines, 'metric').map((line) => line.label)).toEqual([
      'repos',
      'stars',
      'current streak',
      'code changes',
    ]);
  });

  it('includes exactly one loading status', () => {
    const { lines } = buildTerminalOutput(completeStats, defaultProfileConfig);
    const statuses = linesOfType(lines, 'status');

    expect(statuses).toHaveLength(1);
    expect(statuses[0]?.text).toBe('fetching public profile data...');
  });

  it('starts with the typed command prompt', () => {
    const { lines } = buildTerminalOutput(completeStats, defaultProfileConfig);

    expect(lines[0]).toEqual({
      type: 'command',
      prompt: '$',
      text: 'github-profile.sh',
    });
  });

  it('ends with an empty prompt for the cursor', () => {
    const { lines } = buildTerminalOutput(completeStats, defaultProfileConfig);

    expect(lines.at(-1)).toEqual({
      type: 'prompt',
      prompt: '$',
    });
  });

  it('formats a current streak of one day in singular', () => {
    const { lines } = buildTerminalOutput(
      { ...completeStats, currentStreak: 1 },
      withSections({
        repos: false,
        stars: false,
        codeChanges: false,
        languages: false,
      }),
    );

    expect(linesOfType(lines, 'metric')).toEqual([
      { type: 'metric', label: 'current streak', value: '1 day' },
    ]);
  });

  it('prefixes incomplete code changes with ~', () => {
    const { lines } = buildTerminalOutput(
      {
        ...completeStats,
        codeChanges: {
          ...completeStats.codeChanges,
          complete: false,
        },
      },
      defaultProfileConfig,
    );

    expect(
      linesOfType(lines, 'metric').find((line) => line.label === 'code changes')
        ?.value,
    ).toBe('~8.4k');
  });

  it('omits the languages block when there are no languages', () => {
    const { lines } = buildTerminalOutput(
      { ...completeStats, topLanguages: [] },
      defaultProfileConfig,
    );

    expect(linesOfType(lines, 'heading')).toEqual([]);
    expect(linesOfType(lines, 'language')).toEqual([]);
  });

  it('omits the languages block when the section is disabled', () => {
    const { lines } = buildTerminalOutput(
      completeStats,
      withSections({ languages: false }),
    );

    expect(linesOfType(lines, 'heading')).toEqual([]);
    expect(linesOfType(lines, 'language')).toEqual([]);
  });
});
