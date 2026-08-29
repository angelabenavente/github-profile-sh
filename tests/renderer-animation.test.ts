import { describe, expect, it } from 'vitest';

import {
  createAnimationTimeline,
  type AnimationConfig,
} from '../packages/core/src/animation/index.js';
import { renderTerminalSvg } from '../packages/core/src/renderer/index.js';
import { completeOutput } from './fixtures/terminal-output.js';

const sequential: AnimationConfig = { enabled: true, mode: 'sequential' };
const typing: AnimationConfig = { enabled: true, mode: 'typing' };
const none: AnimationConfig = { enabled: true, mode: 'none' };

function renderWith(animation: AnimationConfig): string {
  return renderTerminalSvg(completeOutput, {
    timeline: createAnimationTimeline(completeOutput, animation),
  });
}

function groupBlock(svg: string, id: string): string {
  const start = svg.indexOf(`<g id="${id}"`);
  expect(start).toBeGreaterThan(-1);

  const end = svg.indexOf('</g>', start);
  expect(end).toBeGreaterThan(start);

  return svg.slice(start, end + 4);
}

function animateBeginMs(block: string): number {
  const match = /<animate[^>]*begin="(\d+)ms"/.exec(block);

  if (match?.[1] === undefined) {
    throw new Error(`missing animate begin in ${block}`);
  }

  return Number(match[1]);
}

describe('renderTerminalSvg animation', () => {
  it('keeps mode none and omitted timelines static', () => {
    const staticSvg = renderTerminalSvg(completeOutput);
    const noneSvg = renderWith(none);

    expect(staticSvg).not.toContain('<animate');
    expect(staticSvg).not.toContain('<set');
    expect(noneSvg).not.toContain('<animate');
    expect(noneSvg).not.toContain('<set');
    expect(noneSvg).toBe(staticSvg);
    expect(noneSvg).toContain('github-profile.sh');
    expect(noneSvg).toContain('fetching public profile data...');
  });

  it('uses freeze fades from the sequential timeline', () => {
    const timeline = createAnimationTimeline(completeOutput, sequential);
    const svg = renderTerminalSvg(completeOutput, { timeline });
    const command = groupBlock(svg, 'line-command');
    const loading = groupBlock(svg, 'line-status');

    expect(svg.match(/<animate /g)).toHaveLength(11);
    expect(svg.match(/<g id="language-\d+"/g)).toHaveLength(3);
    expect(command).toContain('github-profile.sh');
    expect(command).not.toContain('fetching public profile data...');
    expect(animateBeginMs(command)).toBe(0);
    expect(loading).toContain('fetching public profile data...');
    expect(svg.match(/fetching public profile data\.\.\./g)).toHaveLength(1);
    expect(animateBeginMs(loading)).toBe(
      timeline.steps.find((step) => step.type === 'lineReveal')?.startMs,
    );
    expect(svg).toContain('fill="freeze"');
    expect(svg).not.toContain('repeatCount="indefinite"');
    expect(svg).not.toContain('repeatDur');
    expect(svg).not.toContain('@keyframes');
  });

  it('reveals metrics, languages, and the prompt in timeline order', () => {
    const timeline = createAnimationTimeline(completeOutput, sequential);
    const svg = renderTerminalSvg(completeOutput, { timeline });
    const metricBegins = [0, 1, 2, 3].map((index) =>
      animateBeginMs(groupBlock(svg, `metric-${String(index)}`)),
    );
    const languageBegins = [0, 1, 2].map((index) =>
      animateBeginMs(groupBlock(svg, `language-${String(index)}`)),
    );
    const headingBegin = animateBeginMs(groupBlock(svg, 'line-heading'));
    const promptBegin = animateBeginMs(groupBlock(svg, 'line-prompt'));
    const languageStepStarts = timeline.steps
      .filter((step) => step.type === 'languageReveal')
      .map((step) => step.startMs);

    expect(metricBegins).toEqual(
      timeline.steps
        .filter(
          (step) => step.type === 'lineReveal' && step.lineType === 'metric',
        )
        .map((step) => step.startMs),
    );
    expect(metricBegins).toEqual(
      [...metricBegins].sort((left, right) => left - right),
    );
    expect(languageBegins).toEqual(languageStepStarts);
    expect(languageBegins).toEqual(
      [...languageBegins].sort((left, right) => left - right),
    );
    expect(headingBegin).toBeLessThan(
      languageBegins[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(promptBegin).toBeGreaterThan(languageBegins.at(-1) ?? -1);
    expect(groupBlock(svg, 'language-0')).toContain('TypeScript');
    expect(groupBlock(svg, 'language-0')).toContain('class="track"');
    expect(groupBlock(svg, 'language-0')).toContain('class="bar"');
    expect(groupBlock(svg, 'language-0')).toContain('62%');
    expect(groupBlock(svg, 'language-0').match(/<animate /g)).toHaveLength(1);
  });

  it('treats typing command as a single sequential reveal for now', () => {
    const svg = renderWith(typing);
    const command = groupBlock(svg, 'line-command');

    expect(command).toContain('github-profile.sh');
    expect(command.match(/<animate /g)).toHaveLength(1);
    expect(animateBeginMs(command)).toBe(0);
    expect(svg).not.toMatch(/tspan[^>]*>g<\/tspan>/);
    expect(animateBeginMs(groupBlock(svg, 'line-status'))).toBeGreaterThan(0);
  });

  it('keeps the cursor static and the document self-contained', () => {
    const svg = renderWith(sequential);
    const prompt = groupBlock(svg, 'line-prompt');

    expect(prompt).toContain('class="cursor"');
    expect(prompt).not.toContain('values="');
    expect(svg).not.toContain('attributeName="visibility"');
    expect(svg).not.toContain('<animateTransform');
    expect(svg).not.toContain('<script');
    expect(svg).not.toContain('href="http');
    expect(svg).not.toContain('xlink:href');
    expect(svg).not.toContain('<foreignObject');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title>github-profile.sh</title>');
    expect(renderWith(sequential)).toBe(svg);
    expect(svg).toContain('id="metric-0"');
    expect(svg).toContain('id="language-0"');
  });
});
