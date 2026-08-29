import { formatMetricLine } from '../terminal/format.js';
import type { TerminalLine, TerminalOutput } from '../terminal/types.js';

import { escapeXml } from './escape.js';
import {
  commandTextX,
  fontFamily,
  languageBarX,
  languagePercentX,
  layout,
  measureTerminalLayout,
  palette,
} from './layout.js';
import { truncateLanguageName } from './text.js';

function renderStyle(): string {
  return `<style>
    text {
      font-family: ${fontFamily};
      font-size: ${String(layout.fontSize)}px;
      white-space: pre;
    }
    .fg { fill: ${palette.foreground}; }
    .muted { fill: ${palette.muted}; }
    .dots { fill: ${palette.muted}; fill-opacity: 0.55; }
    .accent { fill: ${palette.accent}; }
    .track { fill: ${palette.track}; }
    .bar { fill: ${palette.accent}; }
    .cursor { fill: ${palette.foreground}; }
  </style>`;
}

function renderBackground(height: number): string {
  return `<rect width="${String(layout.width)}" height="${String(height)}" rx="${String(layout.radius)}" fill="${palette.background}"/>`;
}

function text(
  x: number,
  y: number,
  className: string,
  content: string,
  extras = '',
): string {
  return `<text x="${String(x)}" y="${String(y)}" class="${className}" dominant-baseline="middle"${extras}>${escapeXml(content)}</text>`;
}

function renderCommand(
  line: Extract<TerminalLine, { type: 'command' }>,
  y: number,
): string {
  const prompt = text(layout.paddingX, y, 'accent', line.prompt);
  const command = text(commandTextX(), y, 'fg', line.text);

  return `${prompt}${command}`;
}

function renderMetric(
  line: Extract<TerminalLine, { type: 'metric' }>,
  y: number,
): string {
  const formatted = formatMetricLine(
    line.label,
    line.value,
    layout.metricLineWidth,
  );
  const dots = formatted.slice(
    line.label.length,
    formatted.length - line.value.length,
  );

  return `<text x="${String(layout.paddingX)}" y="${String(y)}" dominant-baseline="middle"><tspan class="fg">${escapeXml(line.label)}</tspan><tspan class="dots">${escapeXml(dots)}</tspan><tspan class="fg">${escapeXml(line.value)}</tspan></text>`;
}

function languageFillWidth(percentage: number): number {
  return Math.round(
    (layout.languageBarWidth * Math.min(Math.max(percentage, 0), 100)) / 100,
  );
}

function renderLanguage(
  line: Extract<TerminalLine, { type: 'language' }>,
  y: number,
): string {
  const barX = languageBarX();
  const barY = y - layout.languageBarHeight / 2;
  const fillWidth = languageFillWidth(line.percentage);
  const radius = layout.languageBarRadius;
  const displayName = truncateLanguageName(
    line.name,
    layout.languageNameMaxChars,
  );

  const name = text(layout.paddingX, y, 'fg', displayName);
  const track = `<rect class="track" x="${String(barX)}" y="${String(barY)}" width="${String(layout.languageBarWidth)}" height="${String(layout.languageBarHeight)}" rx="${String(radius)}"/>`;
  const bar =
    fillWidth === 0
      ? ''
      : `<rect class="bar" x="${String(barX)}" y="${String(barY)}" width="${String(fillWidth)}" height="${String(layout.languageBarHeight)}" rx="${String(radius)}"/>`;
  const percent = text(
    languagePercentX(),
    y,
    'muted',
    `${String(line.percentage)}%`,
    ' text-anchor="end"',
  );

  return `${name}${track}${bar}${percent}`;
}

function renderPrompt(
  line: Extract<TerminalLine, { type: 'prompt' }>,
  y: number,
): string {
  const prompt = text(layout.paddingX, y, 'accent', line.prompt);
  const cursorX = commandTextX();
  const cursorY = y - layout.cursorHeight / 2;
  const cursor = `<rect class="cursor" x="${String(cursorX)}" y="${String(cursorY)}" width="${String(layout.cursorWidth)}" height="${String(layout.cursorHeight)}"/>`;

  return `${prompt}${cursor}`;
}

function renderLine(line: TerminalLine, y: number): string {
  switch (line.type) {
    case 'command':
      return renderCommand(line, y);
    case 'status':
      return text(layout.paddingX, y, 'muted', line.text);
    case 'metric':
      return renderMetric(line, y);
    case 'heading':
      return text(layout.paddingX, y, 'muted', line.text);
    case 'language':
      return renderLanguage(line, y);
    case 'prompt':
      return renderPrompt(line, y);
    case 'blank':
      return '';
  }
}

const svgDescription =
  'Public GitHub profile statistics shown as a terminal session.';

export function renderTerminalSvg(output: TerminalOutput): string {
  const { height, baselines } = measureTerminalLayout(output.lines);
  const body = output.lines
    .map((line, index) => renderLine(line, baselines[index] ?? 0))
    .filter((fragment) => fragment !== '')
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(layout.width)}" height="${String(height)}" viewBox="0 0 ${String(layout.width)} ${String(height)}" role="img"><title>github-profile.sh</title><desc>${svgDescription}</desc>${renderStyle()}${renderBackground(height)}${body}</svg>`;
}
