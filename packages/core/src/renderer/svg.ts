import { formatMetricLine } from '../terminal/format.js';
import type { TerminalLine, TerminalOutput } from '../terminal/types.js';

import { escapeXml } from './escape.js';
import {
  fontFamily,
  layout,
  lineBaseline,
  palette,
  svgHeight,
} from './layout.js';

function renderStyle(): string {
  return `<style>
    text {
      font-family: ${fontFamily};
      font-size: ${String(layout.fontSize)}px;
      white-space: pre;
    }
    .fg { fill: ${palette.foreground}; }
    .muted { fill: ${palette.muted}; }
    .dots { fill: ${palette.dots}; }
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
): string {
  return `<text x="${String(x)}" y="${String(y)}" class="${className}" dominant-baseline="middle">${escapeXml(content)}</text>`;
}

function renderCommand(
  line: Extract<TerminalLine, { type: 'command' }>,
  y: number,
): string {
  const prompt = `<text x="${String(layout.paddingX)}" y="${String(y)}" class="accent" dominant-baseline="middle">${escapeXml(line.prompt)}</text>`;
  const command = `<text x="${String(layout.paddingX + 16)}" y="${String(y)}" class="fg" dominant-baseline="middle">${escapeXml(line.text)}</text>`;

  return `${prompt}${command}`;
}

function renderMetric(
  line: Extract<TerminalLine, { type: 'metric' }>,
  y: number,
): string {
  const formatted = formatMetricLine(line.label, line.value);
  const dots = formatted.slice(
    line.label.length,
    formatted.length - line.value.length,
  );

  return `<text x="${String(layout.paddingX)}" y="${String(y)}" dominant-baseline="middle"><tspan class="fg">${escapeXml(line.label)}</tspan><tspan class="dots">${escapeXml(dots)}</tspan><tspan class="fg">${escapeXml(line.value)}</tspan></text>`;
}

function renderLanguage(
  line: Extract<TerminalLine, { type: 'language' }>,
  y: number,
): string {
  const barX = layout.paddingX + layout.languageNameWidth;
  const barY = y - layout.languageBarHeight / 2;
  const fillWidth = Math.round(
    (layout.languageBarWidth * Math.min(Math.max(line.percentage, 0), 100)) /
      100,
  );
  const percentX = barX + layout.languageBarWidth + layout.languagePercentGap;

  const name = text(layout.paddingX, y, 'fg', line.name);
  const track = `<rect class="track" x="${String(barX)}" y="${String(barY)}" width="${String(layout.languageBarWidth)}" height="${String(layout.languageBarHeight)}" rx="2"/>`;
  const bar =
    fillWidth === 0
      ? ''
      : `<rect class="bar" x="${String(barX)}" y="${String(barY)}" width="${String(fillWidth)}" height="${String(layout.languageBarHeight)}" rx="2"/>`;
  const percent = text(percentX, y, 'muted', `${String(line.percentage)}%`);

  return `${name}${track}${bar}${percent}`;
}

function renderPrompt(
  line: Extract<TerminalLine, { type: 'prompt' }>,
  y: number,
): string {
  const prompt = text(layout.paddingX, y, 'accent', line.prompt);
  const cursorX = layout.paddingX + layout.cursorGap;
  const cursorY = y - layout.cursorHeight / 2;
  const cursor = `<rect class="cursor" x="${String(cursorX)}" y="${String(cursorY)}" width="${String(layout.cursorWidth)}" height="${String(layout.cursorHeight)}"/>`;

  return `${prompt}${cursor}`;
}

function renderLine(line: TerminalLine, index: number): string {
  const y = lineBaseline(index);

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
  const height = svgHeight(output.lines.length);
  const body = output.lines
    .map((line, index) => renderLine(line, index))
    .filter((fragment) => fragment !== '')
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(layout.width)}" height="${String(height)}" viewBox="0 0 ${String(layout.width)} ${String(height)}" role="img"><title>github-profile.sh</title><desc>${svgDescription}</desc>${renderStyle()}${renderBackground(height)}${body}</svg>`;
}
