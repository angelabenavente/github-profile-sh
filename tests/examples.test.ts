import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseProfileConfig } from '../packages/core/src/config/index.js';
import { generatedSvgAttributionComment } from '../packages/core/src/renderer/index.js';
import {
  getTheme,
  themeCatalog,
  themeIds,
  themeLabel,
} from '../packages/core/src/theme/index.js';
import {
  exampleFileContents,
  exampleFiles,
  exampleMatrixConfig,
  exampleTypingConfig,
  exampleUbuntuConfig,
  renderExampleSvg,
  themeExamplePath,
} from '../scripts/generate-examples.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const themeGalleryDir = join(repoRoot, 'examples/themes');

function readExample(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

function readmeExampleImages(readme: string): string[] {
  return [...readme.matchAll(/!\[[^\]]*]\((\.\/examples\/[^)]+)\)/g)].flatMap(
    (match) => {
      const relativePath = match[1];
      return relativePath == null ? [] : [relativePath];
    },
  );
}

describe('example config', () => {
  it('parses the default Dark example as a real ProfileConfig', () => {
    const parsed = parseProfileConfig(readExample(exampleFiles.config));

    expect(parsed).toEqual(exampleTypingConfig);
    expect(parsed.theme).toBe('dark');
    expect(parsed.animation.mode).toBe('typing');
    expect(parsed.update.frequency).toBe('daily');
  });

  it('parses the Matrix example with theme matrix', () => {
    const parsed = parseProfileConfig(readExample(exampleFiles.matrixConfig));

    expect(parsed).toEqual(exampleMatrixConfig);
    expect(parsed.theme).toBe('matrix');
    expect(parsed.animation.mode).toBe('typing');
  });

  it('parses the Ubuntu example with sequential animation', () => {
    const parsed = parseProfileConfig(readExample(exampleFiles.ubuntuConfig));

    expect(parsed).toEqual(exampleUbuntuConfig);
    expect(parsed.theme).toBe('ubuntu');
    expect(parsed.animation.mode).toBe('sequential');
  });
});

describe('example SVGs', () => {
  it('keeps generated files in sync with the renderer', () => {
    const files = exampleFileContents();

    expect(readExample(exampleFiles.typing)).toBe(files.typing);
    expect(readExample(exampleFiles.static)).toBe(files.static);
    expect(readExample(exampleFiles.config)).toBe(files.config);
    expect(readExample(exampleFiles.matrixConfig)).toBe(files.matrixConfig);
    expect(readExample(exampleFiles.matrix)).toBe(files.matrix);
    expect(readExample(exampleFiles.ubuntuConfig)).toBe(files.ubuntuConfig);
    expect(readExample(exampleFiles.ubuntu)).toBe(files.ubuntu);

    for (const themeId of themeIds) {
      expect(readExample(themeExamplePath(themeId))).toBe(
        files.themes[themeId],
      );
    }
  });

  it('renders valid SVG with the fixture metrics', () => {
    const typing = readExample(exampleFiles.typing);
    const staticSvg = readExample(exampleFiles.static);
    const matrix = readExample(exampleFiles.matrix);
    const ubuntu = readExample(exampleFiles.ubuntu);

    for (const svg of [typing, staticSvg, matrix, ubuntu]) {
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

  it('renders a static preview for every registered theme and no extras', () => {
    const files = exampleFileContents();
    const onDisk = readdirSync(themeGalleryDir)
      .filter((name) => name.endsWith('.svg'))
      .map((name) => name.slice(0, -4));

    expect(themeIds).toHaveLength(16);
    expect(onDisk.sort()).toEqual([...themeIds].sort());
    expect(Object.keys(files.themes).sort()).toEqual([...themeIds].sort());

    for (const themeId of themeIds) {
      const svg = files.themes[themeId];
      const palette = getTheme(themeId);

      expect(existsSync(join(repoRoot, themeExamplePath(themeId)))).toBe(true);
      expect(svg).toContain(`fill="${palette.background}"`);
      expect(svg).toContain(`.fg { fill: ${palette.foreground}; }`);
      expect(svg).not.toContain('<animate');
      expect(svg).not.toContain('<set');
      expect(svg).toContain('github-profile.sh');
    }
  });

  it('matches Matrix and Ubuntu examples to their configs', () => {
    const files = exampleFileContents();
    const matrixPalette = getTheme('matrix');
    const ubuntuPalette = getTheme('ubuntu');

    expect(files.matrix).toContain('<animate');
    expect(files.matrix).toContain(`fill="${matrixPalette.background}"`);
    expect(files.ubuntu).toContain('<animate');
    expect(files.ubuntu).toContain(`fill="${ubuntuPalette.background}"`);
    expect(files.ubuntu).toContain('fill="freeze"');
  });

  it('includes playback animation only in the typing hero example', () => {
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
  it('points at generated examples that exist on disk', () => {
    const readme = readExample('README.md');
    const matches = readmeExampleImages(readme);

    expect(matches).toContain('./examples/github-profile.svg');
    expect(matches).toContain('./examples/matrix.svg');
    expect(matches).toContain('./examples/ubuntu.svg');
    expect(matches).not.toContain('./examples/profile.svg');

    for (const themeId of themeIds) {
      expect(matches).toContain(`./${themeExamplePath(themeId)}`);
    }

    for (const relativePath of matches) {
      expect(existsSync(join(repoRoot, relativePath.slice(2)))).toBe(true);
    }
  });

  it('documents every registered theme id and label', () => {
    const readme = readExample('README.md');

    expect(themeCatalog).toHaveLength(themeIds.length);

    for (const themeId of themeIds) {
      expect(readme).toContain(`\`${themeId}\``);
      expect(readme).toContain(themeLabel(themeId));
    }
  });
});
