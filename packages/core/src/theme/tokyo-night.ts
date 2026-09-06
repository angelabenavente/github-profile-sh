import type { ThemePalette } from './palette.js';

export const tokyoNightTheme = {
  background: '#1a1b26',
  foreground: '#c0caf5',
  muted: '#565f89',
  accent: '#7aa2f7',
  track: '#24283b',
} as const satisfies ThemePalette;
