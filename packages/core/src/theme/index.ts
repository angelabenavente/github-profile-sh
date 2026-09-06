import { amberTheme } from './amber.js';
import type { ThemeId } from './catalog.js';
import { catppuccinTheme } from './catppuccin.js';
import { darkTheme } from './dark.js';
import { draculaTheme } from './dracula.js';
import { githubDarkTheme } from './github-dark.js';
import { gruvboxTheme } from './gruvbox.js';
import { lightTheme } from './light.js';
import { macosTheme } from './macos.js';
import { matrixTheme } from './matrix.js';
import { monokaiTheme } from './monokai.js';
import { nordTheme } from './nord.js';
import type { ThemePalette } from './palette.js';
import { retroGreenTheme } from './retro-green.js';
import { solarizedDarkTheme } from './solarized-dark.js';
import { solarizedLightTheme } from './solarized-light.js';
import { tokyoNightTheme } from './tokyo-night.js';
import { ubuntuTheme } from './ubuntu.js';

export type { ThemePalette } from './palette.js';
export {
  defaultThemeId,
  themeCatalog,
  themeIds,
  themeLabel,
  themeOptions,
  type ThemeId,
} from './catalog.js';

export const themes = {
  dark: darkTheme,
  light: lightTheme,
  'github-dark': githubDarkTheme,
  ubuntu: ubuntuTheme,
  macos: macosTheme,
  matrix: matrixTheme,
  dracula: draculaTheme,
  nord: nordTheme,
  'tokyo-night': tokyoNightTheme,
  catppuccin: catppuccinTheme,
  gruvbox: gruvboxTheme,
  monokai: monokaiTheme,
  'solarized-dark': solarizedDarkTheme,
  'solarized-light': solarizedLightTheme,
  amber: amberTheme,
  'retro-green': retroGreenTheme,
} as const satisfies Record<ThemeId, ThemePalette>;

export function getTheme(themeId: ThemeId): ThemePalette {
  return themes[themeId];
}
