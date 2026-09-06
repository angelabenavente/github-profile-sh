import type { ThemePalette } from './palette.js';

export const catppuccinTheme = {
  background: '#1e1e2e',
  foreground: '#cdd6f4',
  muted: '#6c7086',
  accent: '#cba6f7',
  track: '#313244',
} as const satisfies ThemePalette;
