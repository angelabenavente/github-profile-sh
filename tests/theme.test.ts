import { describe, expect, it } from 'vitest';

import { createAnimationTimeline } from '../packages/core/src/animation/index.js';
import { parseProfileConfig } from '../packages/core/src/config/index.js';
import { renderTerminalSvg } from '../packages/core/src/renderer/index.js';
import {
  defaultThemeId,
  getTheme,
  themeIds,
  themes,
  type ThemePalette,
} from '../packages/core/src/theme/index.js';
import { completeOutput } from './fixtures/terminal-output.js';

const requiredTokens = [
  'background',
  'foreground',
  'muted',
  'accent',
  'track',
] as const satisfies readonly (keyof ThemePalette)[];

function hexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/.test(value);
}

describe('theme registry', () => {
  it('contains dark as the only registered theme', () => {
    expect(themeIds).toEqual(['dark']);
    expect(defaultThemeId).toBe('dark');
    expect(themes.dark).toEqual(getTheme('dark'));
  });

  it('defines every palette token used by the renderer', () => {
    const dark = getTheme('dark');

    expect(Object.keys(dark).sort()).toEqual([...requiredTokens].sort());

    for (const token of requiredTokens) {
      expect(hexColor(dark[token])).toBe(true);
    }
  });

  it('resolves dark to the current terminal palette', () => {
    expect(getTheme('dark')).toEqual({
      background: '#0d1117',
      foreground: '#e6edf3',
      muted: '#8b949e',
      accent: '#3fb950',
      track: '#21262d',
    });
  });
});

describe('theme config', () => {
  it('accepts theme dark', () => {
    expect(parseProfileConfig('theme: dark\n').theme).toBe('dark');
    expect(parseProfileConfig('').theme).toBe('dark');
  });

  it('rejects an unknown theme', () => {
    expect(() => parseProfileConfig('theme: ubuntu\n')).toThrowError(
      /Invalid profile config:.*theme/s,
    );
  });
});

describe('theme renderer', () => {
  it('uses the resolved dark palette for colors', () => {
    const palette = getTheme('dark');
    const svg = renderTerminalSvg(completeOutput, { theme: 'dark' });

    expect(svg).toContain(`.fg { fill: ${palette.foreground}; }`);
    expect(svg).toContain(`.muted { fill: ${palette.muted}; }`);
    expect(svg).toContain(
      `.dots { fill: ${palette.muted}; fill-opacity: 0.55; }`,
    );
    expect(svg).toContain(`.accent { fill: ${palette.accent}; }`);
    expect(svg).toContain(`.track { fill: ${palette.track}; }`);
    expect(svg).toContain(`.bar { fill: ${palette.accent}; }`);
    expect(svg).toContain(`.cursor { fill: ${palette.foreground}; }`);
    expect(svg).toContain(`.command-cursor { fill: ${palette.accent}; }`);
    expect(svg).toContain(`fill="${palette.background}"`);
  });

  it('matches the default renderer output for theme dark', () => {
    expect(renderTerminalSvg(completeOutput)).toBe(
      renderTerminalSvg(completeOutput, { theme: 'dark' }),
    );
  });

  it('keeps typing, sequential, and none animation working with dark', () => {
    const palette = getTheme('dark');
    const typing = renderTerminalSvg(completeOutput, {
      theme: 'dark',
      timeline: createAnimationTimeline(completeOutput, {
        enabled: true,
        mode: 'typing',
      }),
    });
    const sequential = renderTerminalSvg(completeOutput, {
      theme: 'dark',
      timeline: createAnimationTimeline(completeOutput, {
        enabled: true,
        mode: 'sequential',
      }),
    });
    const none = renderTerminalSvg(completeOutput, {
      theme: 'dark',
      timeline: createAnimationTimeline(completeOutput, {
        enabled: true,
        mode: 'none',
      }),
    });

    expect(typing).toContain('<animate');
    expect(typing).toContain('class="command-cursor"');
    expect(sequential).toContain('<animate');
    expect(sequential).toContain('fill="freeze"');
    expect(none).not.toContain('<animate');
    expect(none).toBe(renderTerminalSvg(completeOutput));

    for (const svg of [typing, sequential, none]) {
      expect(svg).toContain(`.fg { fill: ${palette.foreground}; }`);
      expect(svg).toContain(`fill="${palette.background}"`);
      expect(svg).toContain('github-profile.sh');
    }
  });
});
