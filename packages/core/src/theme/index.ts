import { darkTheme } from './dark.js';
import type { ThemePalette } from './palette.js';

export type { ThemePalette } from './palette.js';

export const themes = {
  dark: darkTheme,
} as const;

export type ThemeId = keyof typeof themes;

export const themeIds = Object.keys(themes) as [ThemeId, ...ThemeId[]];

export const defaultThemeId: ThemeId = 'dark';

export function getTheme(themeId: ThemeId): ThemePalette {
  return themes[themeId];
}
