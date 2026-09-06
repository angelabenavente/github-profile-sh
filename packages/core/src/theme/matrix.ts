import type { ThemePalette } from './palette.js';

export const matrixTheme = {
  background: '#000000',
  foreground: '#00ff41',
  muted: '#008f11',
  accent: '#39ff14',
  track: '#003b00',
} as const satisfies ThemePalette;
