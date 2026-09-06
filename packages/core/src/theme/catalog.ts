export const themeCatalog = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'github-dark', label: 'GitHub Dark' },
  { id: 'ubuntu', label: 'Ubuntu' },
  { id: 'macos', label: 'macOS' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'nord', label: 'Nord' },
  { id: 'tokyo-night', label: 'Tokyo Night' },
  { id: 'catppuccin', label: 'Catppuccin' },
  { id: 'gruvbox', label: 'Gruvbox' },
  { id: 'monokai', label: 'Monokai' },
  { id: 'solarized-dark', label: 'Solarized Dark' },
  { id: 'solarized-light', label: 'Solarized Light' },
  { id: 'amber', label: 'Amber' },
  { id: 'retro-green', label: 'Retro Green' },
] as const;

export type ThemeId = (typeof themeCatalog)[number]['id'];

export const themeIds = themeCatalog.map((theme) => theme.id) as [
  ThemeId,
  ...ThemeId[],
];

export const defaultThemeId: ThemeId = 'dark';

export const themeOptions = themeCatalog.map((theme) => ({
  value: theme.id,
  label: theme.label,
}));

export function themeLabel(themeId: ThemeId): string {
  const theme = themeCatalog.find((entry) => entry.id === themeId);

  return theme?.label ?? themeId;
}
