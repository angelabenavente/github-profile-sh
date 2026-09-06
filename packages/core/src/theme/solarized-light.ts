import type { ThemePalette } from './palette.js';

export const solarizedLightTheme = {
  background: '#fdf6e3',
  foreground: '#657b83',
  muted: '#93a1a1',
  accent: '#268bd2',
  track: '#eee8d5',
} as const satisfies ThemePalette;
