import type { ThemePalette } from './palette.js';

export const macosTheme = {
  background: '#1c1c1e',
  foreground: '#f5f5f7',
  muted: '#98989d',
  accent: '#30d158',
  track: '#2c2c2e',
} as const satisfies ThemePalette;
