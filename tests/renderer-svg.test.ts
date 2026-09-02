import { describe, expect, it } from 'vitest';

import {
  ORIGINAL_REPOSITORY_URL,
  escapeXml,
  generatedSvgAttributionComment,
  renderTerminalSvg,
  truncateLanguageName,
} from '../packages/core/src/renderer/index.js';
import {
  languageBarX,
  languagePercentX,
  layout,
  measureTerminalLayout,
} from '../packages/core/src/renderer/layout.js';
import { formatMetricLine } from '../packages/core/src/terminal/index.js';
import {
  completeOutput,
  withoutLanguages,
} from './fixtures/terminal-output.js';

function barWidths(svg: string): number[] {
  return [...svg.matchAll(/class="bar"[^>]*width="(\d+)"/g)].map((match) =>
    Number(match[1]),
  );
}

function attributeValues(
  svg: string,
  className: string,
  attribute: string,
): string[] {
  const pattern = new RegExp(
    `class="${className}"[^>]*\\s${attribute}="([^"]+)"`,
    'g',
  );

  return [...svg.matchAll(pattern)].map((match) => match[1] ?? '');
}

function svgHeight(svg: string): number {
  const match = /height="(\d+)"/.exec(svg);

  if (match?.[1] === undefined) {
    throw new Error('missing svg height');
  }

  return Number(match[1]);
}

describe('escapeXml', () => {
  it('escapes XML special characters', () => {
    expect(escapeXml(`<C++ & "C#'>`)).toBe('&lt;C++ &amp; &quot;C#&apos;&gt;');
  });
});

describe('truncateLanguageName', () => {
  it('keeps ordinary and long-but-reasonable names intact', () => {
    expect(truncateLanguageName('Go', layout.languageNameMaxChars)).toBe('Go');
    expect(
      truncateLanguageName('Jupyter Notebook', layout.languageNameMaxChars),
    ).toBe('Jupyter Notebook');
    expect(
      truncateLanguageName('Objective-C', layout.languageNameMaxChars),
    ).toBe('Objective-C');
    expect(
      truncateLanguageName('Visual Basic .NET', layout.languageNameMaxChars),
    ).toBe('Visual Basic .NET');
  });

  it('truncates extremely long names deterministically', () => {
    expect(
      truncateLanguageName(
        'A Very Long Language Name',
        layout.languageNameMaxChars,
      ),
    ).toBe('A Very Long Langu…');
  });
});

describe('renderTerminalSvg', () => {
  it('generates a self-contained svg root', () => {
    const svg = renderTerminalSvg(completeOutput);

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(
      true,
    );
    expect(svg).toContain('role="img"');
    expect(svg).toContain(generatedSvgAttributionComment);
    expect(generatedSvgAttributionComment).toContain(ORIGINAL_REPOSITORY_URL);
    expect(generatedSvgAttributionComment).toContain('CC BY 4.0');
    expect(generatedSvgAttributionComment.slice(4, -3)).not.toContain('--');
    expect(svg).toContain('<title>github-profile.sh</title>');
    expect(svg).toContain('<desc>');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('renders the command and a single loading status', () => {
    const svg = renderTerminalSvg(completeOutput);

    expect(svg).toContain('github-profile.sh');
    expect(svg.match(/fetching public profile data\.\.\./g)).toHaveLength(1);
  });

  it('aligns metric values to a shared column', () => {
    const svg = renderTerminalSvg(completeOutput);
    const formatted = [
      formatMetricLine('repos', '42', layout.metricLineWidth),
      formatMetricLine('stars', '1.8k', layout.metricLineWidth),
      formatMetricLine('current streak', '21 days', layout.metricLineWidth),
      formatMetricLine('code changes', '8.4k', layout.metricLineWidth),
    ];

    expect(
      formatted.every((line) => line.length === layout.metricLineWidth),
    ).toBe(true);
    expect(new Set(formatted.map((line) => line.length)).size).toBe(1);
    expect(svg).toContain('repos');
    expect(svg).toContain('42');
    expect(svg).toContain('stars');
    expect(svg).toContain('1.8k');
    expect(svg).toContain('current streak');
    expect(svg).toContain('21 days');
    expect(svg).toContain('code changes');
    expect(svg).toContain('8.4k');
    expect(svg).toContain('...........................');
  });

  it('renders the languages heading, names, and svg bars', () => {
    const svg = renderTerminalSvg(completeOutput);

    expect(svg).toContain('top languages');
    expect(svg).toContain('TypeScript');
    expect(svg).toContain('Rust');
    expect(svg).toContain('Go');
    expect(svg).toContain('62%');
    expect(svg.match(/class="track"/g)).toHaveLength(3);
    expect(svg.match(/class="bar"/g)).toHaveLength(3);
  });

  it('keeps language columns aligned for short and long names', () => {
    const svg = renderTerminalSvg({
      lines: [
        { type: 'heading', text: 'top languages' },
        { type: 'language', name: 'Go', percentage: 13 },
        { type: 'language', name: 'TypeScript', percentage: 62 },
        { type: 'language', name: 'Visual Basic .NET', percentage: 25 },
        { type: 'prompt', prompt: '$' },
      ],
    });

    expect(new Set(attributeValues(svg, 'track', 'x'))).toEqual(
      new Set([String(languageBarX())]),
    );
    expect(svg.match(/text-anchor="end"/g)).toHaveLength(3);
    expect(svg).toContain(`x="${String(languagePercentX())}"`);
    expect(svg).toContain('Go');
    expect(svg).toContain('Visual Basic .NET');
  });

  it('scales language bars by percentage including 0% and 100%', () => {
    const svg = renderTerminalSvg({
      lines: [
        { type: 'language', name: 'Empty', percentage: 0 },
        { type: 'language', name: 'TypeScript', percentage: 62 },
        { type: 'language', name: 'Full', percentage: 100 },
      ],
    });
    const widths = barWidths(svg);

    expect(svg.match(/class="track"/g)).toHaveLength(3);
    expect(widths).toEqual([
      Math.round((layout.languageBarWidth * 62) / 100),
      layout.languageBarWidth,
    ]);
    expect(widths[0]).toBeGreaterThan(0);
    expect(widths[0]).toBeLessThan(layout.languageBarWidth);
  });

  it('omits the languages section when it is not in the output', () => {
    const svg = renderTerminalSvg(withoutLanguages);

    expect(svg).not.toContain('top languages');
    expect(svg).not.toContain('class="bar"');
    expect(svg).not.toContain('TypeScript');
  });

  it('shrinks the height when there are fewer lines', () => {
    const fullHeight = svgHeight(renderTerminalSvg(completeOutput));
    const shortHeight = svgHeight(renderTerminalSvg(withoutLanguages));

    expect(fullHeight).toBe(measureTerminalLayout(completeOutput.lines).height);
    expect(shortHeight).toBeLessThan(fullHeight);
  });

  it('renders a static cursor after the final prompt', () => {
    const svg = renderTerminalSvg(completeOutput);

    expect(svg).toContain('class="cursor"');
    expect(svg).toContain(
      `width="${String(layout.cursorWidth)}" height="${String(layout.cursorHeight)}"`,
    );
    expect(svg).not.toContain('<animate');
    expect(svg).not.toContain('@keyframes');
    expect(svg).not.toContain('animation:');
  });

  it('escapes dynamic XML text', () => {
    const svg = renderTerminalSvg({
      lines: [
        { type: 'command', prompt: '$', text: 'github-profile.sh' },
        {
          type: 'language',
          name: 'C++ & <Shell>',
          percentage: 10,
        },
        { type: 'prompt', prompt: '$' },
      ],
    });

    expect(svg).toContain('C++ &amp; &lt;Shell&gt;');
    expect(svg).not.toContain('C++ & <Shell>');
  });

  it('is deterministic for the same output', () => {
    expect(renderTerminalSvg(completeOutput)).toBe(
      renderTerminalSvg(completeOutput),
    );
  });

  it('does not include scripts or remote resources', () => {
    const svg = renderTerminalSvg(completeOutput);

    expect(svg).not.toContain('<script');
    expect(svg).not.toContain('href="http');
    expect(svg).not.toContain("href='http");
    expect(svg).not.toContain('xlink:href');
    expect(svg).not.toContain('@import');
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('<foreignObject');
  });
});
