import type { ThemePalette } from './palette.js';

export const ubuntuTheme = {
  background: '#300a24',
  foreground: '#eeeeee',
  muted: '#aea79f',
  accent: '#e95420',
  track: '#1a0614',
} as const satisfies ThemePalette;
