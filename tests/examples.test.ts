import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseProfileConfig } from '../packages/core/src/config/index.js';
import { generatedSvgAttributionComment } from '../packages/core/src/renderer/index.js';
import {
  exampleFileContents,
  exampleFiles,
  exampleTypingConfig,
  renderExampleSvg,
} from '../scripts/generate-examples.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function readExample(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('example config', () => {
  it('parses as a real ProfileConfig', () => {
    const parsed = parseProfileConfig(readExample(exampleFiles.config));

    expect(parsed).toEqual(exampleTypingConfig);
    expect(parsed.animation.mode).toBe('typing');
    expect(parsed.update.frequency).toBe('daily');
  });
});

describe('example SVGs', () => {
  it('keeps generated files in sync with the renderer', () => {
    const files = exampleFileContents();

    expect(readExample(exampleFiles.typing)).toBe(files.typing);
    expect(readExample(exampleFiles.static)).toBe(files.static);
    expect(readExample(exampleFiles.config)).toBe(files.config);
  });

  it('renders valid SVG with the fixture metrics', () => {
    const typing = readExample(exampleFiles.typing);
    const staticSvg = readExample(exampleFiles.static);

    for (const svg of [typing, staticSvg]) {
      expect(svg.startsWith('<svg ')).toBe(true);
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain(generatedSvgAttributionComment);
      expect(svg).toContain('github-profile.sh');
      expect(svg).toContain('fetching public profile data...');
      expect(svg).toContain('repos');
      expect(svg).toContain('42');
      expect(svg).toContain('stars');
      expect(svg).toContain('1.8k');
      expect(svg).toContain('current streak');
      expect(svg).toContain('21 days');
      expect(svg).toContain('code changes');
      expect(svg).toContain('8.4k');
      expect(svg).toContain('top languages');
      expect(svg).toContain('TypeScript');
      expect(svg).toContain('Rust');
      expect(svg).toContain('Go');
      expect(svg).not.toContain('█');
      expect(svg).toContain('class="bar"');
    }
  });

  it('includes playback animation only in the typing example', () => {
    const typing = readExample(exampleFiles.typing);
    const staticSvg = readExample(exampleFiles.static);

    expect(typing).toContain('<animate');
    expect(typing).toContain('<set');
    expect(staticSvg).not.toContain('<animate');
    expect(staticSvg).not.toContain('<set');
  });

  it('is deterministic', () => {
    const first = exampleFileContents();
    const second = exampleFileContents();

    expect(second).toEqual(first);
    expect(renderExampleSvg(exampleTypingConfig)).toBe(
      renderExampleSvg(exampleTypingConfig),
    );
  });
});

describe('README demo', () => {
  it('points at the generated typing example', () => {
    const readme = readExample('README.md');
    const matches = [
      ...readme.matchAll(/!\[[^\]]*]\((\.\/examples\/[^)]+)\)/g),
    ].flatMap((match) => {
      const relativePath = match[1];
      return relativePath == null ? [] : [relativePath];
    });

    expect(matches).toContain('./examples/github-profile.svg');
    expect(matches).not.toContain('./examples/profile.svg');

    for (const relativePath of matches) {
      expect(existsSync(join(repoRoot, relativePath.slice(2)))).toBe(true);
    }
  });
});
