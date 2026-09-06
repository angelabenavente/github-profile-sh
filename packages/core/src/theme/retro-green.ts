import type { ThemePalette } from './palette.js';

export const retroGreenTheme = {
  background: '#001100',
  foreground: '#33ff33',
  muted: '#1a7a1a',
  accent: '#66ff66',
  track: '#003300',
} as const satisfies ThemePalette;
