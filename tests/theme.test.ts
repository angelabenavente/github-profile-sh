import { describe, expect, it } from 'vitest';

import { createAnimationTimeline } from '../packages/core/src/animation/index.js';
import { parseProfileConfig } from '../packages/core/src/config/index.js';
import { renderTerminalSvg } from '../packages/core/src/renderer/index.js';
import {
  defaultThemeId,
  getTheme,
  themeCatalog,
  themeIds,
  themeLabel,
  themeOptions,
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
  it('registers the public themes in catalog order', () => {
    expect(themeIds).toEqual([
      'dark',
      'light',
      'github-dark',
      'ubuntu',
      'macos',
      'matrix',
      'dracula',
      'nord',
      'tokyo-night',
      'catppuccin',
      'gruvbox',
      'monokai',
      'solarized-dark',
      'solarized-light',
      'amber',
      'retro-green',
    ]);
    expect(Object.keys(themes)).toEqual(themeIds);
    expect(defaultThemeId).toBe('dark');
    expect(themes.dark).toEqual(getTheme('dark'));
  });

  it('keeps human labels centralized', () => {
    expect(themeCatalog.map((theme) => theme.label)).toEqual([
      'Dark',
      'Light',
      'GitHub Dark',
      'Ubuntu',
      'macOS',
      'Matrix',
      'Dracula',
      'Nord',
      'Tokyo Night',
      'Catppuccin',
      'Gruvbox',
      'Monokai',
      'Solarized Dark',
      'Solarized Light',
      'Amber',
      'Retro Green',
    ]);
    expect(themeOptions.map((option) => option.value)).toEqual(themeIds);
    expect(themeLabel('github-dark')).toBe('GitHub Dark');
    expect(themeLabel('macos')).toBe('macOS');
    expect(themeLabel('tokyo-night')).toBe('Tokyo Night');
    expect(themeLabel('solarized-dark')).toBe('Solarized Dark');
    expect(themeLabel('solarized-light')).toBe('Solarized Light');
    expect(themeLabel('retro-green')).toBe('Retro Green');
  });

  it('defines every palette token used by the renderer', () => {
    for (const themeId of themeIds) {
      const palette = getTheme(themeId);

      expect(Object.keys(palette).sort()).toEqual([...requiredTokens].sort());

      for (const token of requiredTokens) {
        expect(hexColor(palette[token])).toBe(true);
      }
    }
  });

  it('resolves each registered palette', () => {
    expect(getTheme('dark')).toEqual({
      background: '#0d1117',
      foreground: '#e6edf3',
      muted: '#8b949e',
      accent: '#3fb950',
      track: '#21262d',
    });
    expect(getTheme('ubuntu')).toEqual({
      background: '#300a24',
      foreground: '#eeeeee',
      muted: '#aea79f',
      accent: '#e95420',
      track: '#1a0614',
    });
    expect(getTheme('matrix')).toEqual({
      background: '#000000',
      foreground: '#00ff41',
      muted: '#008f11',
      accent: '#39ff14',
      track: '#003b00',
    });
  });
});

describe('theme config', () => {
  it('accepts every registered theme', () => {
    expect(parseProfileConfig('').theme).toBe('dark');

    for (const themeId of themeIds) {
      expect(parseProfileConfig(`theme: ${themeId}\n`).theme).toBe(themeId);
    }
  });

  it('rejects an unknown theme', () => {
    expect(() => parseProfileConfig('theme: papaya\n')).toThrowError(
      /Invalid profile config:.*theme/s,
    );
  });
});

describe('theme renderer', () => {
  it('uses the resolved palette for each theme', () => {
    for (const themeId of themeIds) {
      const palette = getTheme(themeId);
      const svg = renderTerminalSvg(completeOutput, { theme: themeId });

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
    }
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
