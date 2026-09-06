import type { ThemePalette } from './palette.js';

export const draculaTheme = {
  background: '#282a36',
  foreground: '#f8f8f2',
  muted: '#6272a4',
  accent: '#50fa7b',
  track: '#44475a',
} as const satisfies ThemePalette;
