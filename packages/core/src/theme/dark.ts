import type { ThemePalette } from './palette.js';

export const darkTheme = {
  background: '#0d1117',
  foreground: '#e6edf3',
  muted: '#8b949e',
  accent: '#3fb950',
  track: '#21262d',
} as const satisfies ThemePalette;
