import type { ThemePalette } from './palette.js';

export const gruvboxTheme = {
  background: '#282828',
  foreground: '#ebdbb2',
  muted: '#928374',
  accent: '#fabd2f',
  track: '#3c3836',
} as const satisfies ThemePalette;
