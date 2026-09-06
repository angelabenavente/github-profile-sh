import type { ThemePalette } from './palette.js';

export const lightTheme = {
  background: '#ffffff',
  foreground: '#1f2328',
  muted: '#656d76',
  accent: '#1a7f37',
  track: '#d0d7de',
} as const satisfies ThemePalette;
