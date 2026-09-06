import type { ThemePalette } from './palette.js';

export const nordTheme = {
  background: '#2e3440',
  foreground: '#eceff4',
  muted: '#4c566a',
  accent: '#88c0d0',
  track: '#3b4252',
} as const satisfies ThemePalette;
