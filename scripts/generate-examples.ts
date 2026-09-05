import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAnimationTimeline } from '../packages/core/src/animation/index.js';
import {
  defaultProfileConfig,
  serializeProfileConfig,
  type ProfileConfig,
} from '../packages/core/src/config/index.js';
import type { ProfileStats } from '../packages/core/src/github/index.js';
import { renderTerminalSvg } from '../packages/core/src/renderer/index.js';
import { buildTerminalOutput } from '../packages/core/src/terminal/index.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export const exampleProfileStats: ProfileStats = {
  username: 'example-user',
  repos: 42,
  stars: 1800,
  currentStreak: 21,
  codeChanges: {
    additions: 6000,
    deletions: 2400,
    total: 8400,
    complete: true,
  },
  topLanguages: [
    { name: 'TypeScript', bytes: 62000, percentage: 62 },
    { name: 'Rust', bytes: 25000, percentage: 25 },
    { name: 'Go', bytes: 13000, percentage: 13 },
  ],
};

export const exampleTypingConfig: ProfileConfig = defaultProfileConfig;

export const exampleStaticConfig: ProfileConfig = {
  ...exampleTypingConfig,
  animation: {
    enabled: true,
    mode: 'none',
  },
};

export const exampleFiles = {
  config: 'examples/github-profile.yml',
  typing: 'examples/github-profile.svg',
  static: 'examples/static.svg',
} as const;

export function renderExampleSvg(config: ProfileConfig): string {
  const output = buildTerminalOutput(exampleProfileStats, config);
  const timeline = createAnimationTimeline(output, config.animation);

  return renderTerminalSvg(output, { timeline, theme: config.theme });
}

export function exampleFileContents(): {
  config: string;
  typing: string;
  static: string;
} {
  return {
    config: serializeProfileConfig(exampleTypingConfig),
    typing: withTrailingNewline(renderExampleSvg(exampleTypingConfig)),
    static: withTrailingNewline(renderExampleSvg(exampleStaticConfig)),
  };
}

export function writeExamples(root = repoRoot): void {
  const files = exampleFileContents();

  mkdirSync(join(root, 'examples'), { recursive: true });
  writeFileSync(join(root, exampleFiles.config), files.config);
  writeFileSync(join(root, exampleFiles.typing), files.typing);
  writeFileSync(join(root, exampleFiles.static), files.static);
}

function withTrailingNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`;
}

const invokedDirectly = process.argv.some((argument) =>
  argument.replaceAll('\\', '/').endsWith('/scripts/generate-examples.ts'),
);

if (invokedDirectly) {
  writeExamples();
}
