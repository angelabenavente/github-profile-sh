export const layout = {
  width: 700,
  paddingX: 32,
  paddingY: 28,
  fontSize: 16,
  lineHeight: 28,
  charWidth: 10,
  metricLineWidth: 36,
  languageNameMaxChars: 18,
  languageNameGap: 20,
  languageBarWidth: 240,
  languageBarHeight: 9,
  languageBarRadius: 2,
  languagePercentChars: 4,
  languagePercentGap: 16,
  headingGap: 10,
  cursorWidth: 10,
  cursorHeight: 16,
  radius: 10,
} as const;

export const fontFamily =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

type LineLike = {
  type: string;
};

export function languageNameColumnWidth(): number {
  return layout.languageNameMaxChars * layout.charWidth;
}

export function languageBarX(): number {
  return layout.paddingX + languageNameColumnWidth() + layout.languageNameGap;
}

export function languagePercentX(): number {
  return (
    languageBarX() +
    layout.languageBarWidth +
    layout.languagePercentGap +
    layout.languagePercentChars * layout.charWidth
  );
}

export function commandTextX(): number {
  return layout.paddingX + layout.charWidth * 2;
}

export function measureTerminalLayout(lines: readonly LineLike[]): {
  height: number;
  baselines: number[];
} {
  const baselines: number[] = [];
  let top = layout.paddingY;

  for (const [index, line] of lines.entries()) {
    baselines.push(top + layout.lineHeight / 2);
    top += layout.lineHeight;

    const next = lines[index + 1];
    if (line.type === 'heading' && next?.type === 'language') {
      top += layout.headingGap;
    }
  }

  return {
    height: top + layout.paddingY,
    baselines,
  };
}
