import type { ThemePalette } from './palette.js';

export const solarizedDarkTheme = {
  background: '#002b36',
  foreground: '#839496',
  muted: '#586e75',
  accent: '#268bd2',
  track: '#073642',
} as const satisfies ThemePalette;
