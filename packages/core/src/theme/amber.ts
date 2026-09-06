import type { ThemePalette } from './palette.js';

export const amberTheme = {
  background: '#1a1200',
  foreground: '#ffb000',
  muted: '#a67c00',
  accent: '#ffcc33',
  track: '#332200',
} as const satisfies ThemePalette;
