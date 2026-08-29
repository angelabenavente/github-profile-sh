export const layout = {
  width: 700,
  paddingX: 28,
  paddingY: 24,
  fontSize: 16,
  lineHeight: 26,
  languageNameWidth: 148,
  languageBarWidth: 220,
  languageBarHeight: 8,
  languagePercentGap: 16,
  cursorWidth: 9,
  cursorHeight: 16,
  cursorGap: 18,
  radius: 8,
} as const;

export const palette = {
  background: '#0d1117',
  foreground: '#e6edf3',
  muted: '#8b949e',
  dots: '#484f58',
  accent: '#3fb950',
  track: '#21262d',
} as const;

export const fontFamily =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export function svgHeight(lineCount: number): number {
  return layout.paddingY * 2 + lineCount * layout.lineHeight;
}

export function lineBaseline(index: number): number {
  return layout.paddingY + index * layout.lineHeight + layout.lineHeight / 2;
}
