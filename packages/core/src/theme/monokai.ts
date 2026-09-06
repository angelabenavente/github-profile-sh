import type { ThemePalette } from './palette.js';

export const monokaiTheme = {
  background: '#272822',
  foreground: '#f8f8f2',
  muted: '#75715e',
  accent: '#a6e22e',
  track: '#3e3d32',
} as const satisfies ThemePalette;
