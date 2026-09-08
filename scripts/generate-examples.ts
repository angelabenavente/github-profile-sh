import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GITHUB_PROFILE_ACTION } from '../packages/cli/src/workflow/action-ref.js';
import { PROFILE_COMMIT_MESSAGE } from '../packages/cli/src/workflow/generate.js';
import { createAnimationTimeline } from '../packages/core/src/animation/index.js';
import {
  defaultProfileConfig,
  serializeProfileConfig,
  type ProfileConfig,
} from '../packages/core/src/config/index.js';
import type { ProfileStats } from '../packages/core/src/github/index.js';
import { renderTerminalSvg } from '../packages/core/src/renderer/index.js';
import { buildTerminalOutput } from '../packages/core/src/terminal/index.js';
import { themeIds, type ThemeId } from '../packages/core/src/theme/index.js';

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

export const exampleMatrixConfig: ProfileConfig = {
  ...exampleTypingConfig,
  theme: 'matrix',
};

export const exampleUbuntuConfig: ProfileConfig = {
  ...exampleTypingConfig,
  theme: 'ubuntu',
  animation: {
    enabled: true,
    mode: 'sequential',
  },
};

export const exampleMultiSvgMainConfig: ProfileConfig = {
  sections: {
    repos: true,
    stars: true,
    streak: true,
    codeChanges: true,
    languages: false,
  },
  theme: 'ubuntu',
  animation: {
    enabled: true,
    mode: 'typing',
  },
  update: {
    frequency: 'daily',
  },
};

export const exampleMultiSvgLanguagesConfig: ProfileConfig = {
  sections: {
    repos: false,
    stars: false,
    streak: false,
    codeChanges: false,
    languages: true,
  },
  theme: 'matrix',
  animation: {
    enabled: true,
    mode: 'sequential',
  },
  update: {
    frequency: 'daily',
  },
};

export const exampleFiles = {
  config: 'examples/github-profile.yml',
  typing: 'examples/github-profile.svg',
  static: 'examples/static.svg',
  matrixConfig: 'examples/matrix.yml',
  matrix: 'examples/matrix.svg',
  ubuntuConfig: 'examples/ubuntu.yml',
  ubuntu: 'examples/ubuntu.svg',
  multiSvgMainConfig: 'examples/multi-svg/main.yml',
  multiSvgLanguagesConfig: 'examples/multi-svg/languages.yml',
  multiSvgMain: 'examples/multi-svg/main.svg',
  multiSvgLanguages: 'examples/multi-svg/languages.svg',
  multiSvgWorkflow: 'examples/multi-svg/workflow.yml',
} as const;

export function themeExamplePath(themeId: ThemeId): string {
  return `examples/themes/${themeId}.svg`;
}

export function renderExampleSvg(config: ProfileConfig): string {
  const output = buildTerminalOutput(exampleProfileStats, config);
  const timeline = createAnimationTimeline(output, config.animation);

  return renderTerminalSvg(output, { timeline, theme: config.theme });
}

export function exampleThemeConfig(theme: ThemeId): ProfileConfig {
  return {
    ...exampleStaticConfig,
    theme,
  };
}

export function exampleMultiSvgWorkflow(): string {
  return [
    'name: Update github-profile.sh',
    '',
    'on:',
    '  workflow_dispatch:',
    '  schedule:',
    "    - cron: '0 3 * * *'",
    '',
    'permissions:',
    '  contents: write',
    '',
    'jobs:',
    '  update:',
    '    runs-on: ubuntu-latest',
    '',
    '    steps:',
    '      - name: Checkout repository',
    '        uses: actions/checkout@v6',
    '',
    '      - name: Generate main profile',
    `        uses: ${GITHUB_PROFILE_ACTION}`,
    '        with:',
    '          config: github-profile-main.yml',
    '          output: github-profile.svg',
    '          token: ${{ github.token }}',
    '',
    '      - name: Generate languages',
    `        uses: ${GITHUB_PROFILE_ACTION}`,
    '        with:',
    '          config: github-profile-languages.yml',
    '          output: github-languages.svg',
    '          token: ${{ github.token }}',
    '',
    '      - name: Commit profiles',
    '        run: |',
    '          git config user.name "github-actions[bot]"',
    '          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"',
    '          git add github-profile.svg github-languages.svg',
    `          git diff --cached --quiet || git commit -m "${PROFILE_COMMIT_MESSAGE}"`,
    '          git push',
    '',
  ].join('\n');
}

export function exampleFileContents(): {
  config: string;
  typing: string;
  static: string;
  matrixConfig: string;
  matrix: string;
  ubuntuConfig: string;
  ubuntu: string;
  multiSvgMainConfig: string;
  multiSvgLanguagesConfig: string;
  multiSvgMain: string;
  multiSvgLanguages: string;
  multiSvgWorkflow: string;
  themes: Record<ThemeId, string>;
} {
  return {
    config: serializeProfileConfig(exampleTypingConfig),
    typing: withTrailingNewline(renderExampleSvg(exampleTypingConfig)),
    static: withTrailingNewline(renderExampleSvg(exampleStaticConfig)),
    matrixConfig: serializeProfileConfig(exampleMatrixConfig),
    matrix: withTrailingNewline(renderExampleSvg(exampleMatrixConfig)),
    ubuntuConfig: serializeProfileConfig(exampleUbuntuConfig),
    ubuntu: withTrailingNewline(renderExampleSvg(exampleUbuntuConfig)),
    multiSvgMainConfig: serializeProfileConfig(exampleMultiSvgMainConfig),
    multiSvgLanguagesConfig: serializeProfileConfig(
      exampleMultiSvgLanguagesConfig,
    ),
    multiSvgMain: withTrailingNewline(
      renderExampleSvg(exampleMultiSvgMainConfig),
    ),
    multiSvgLanguages: withTrailingNewline(
      renderExampleSvg(exampleMultiSvgLanguagesConfig),
    ),
    multiSvgWorkflow: exampleMultiSvgWorkflow(),
    themes: Object.fromEntries(
      themeIds.map((themeId) => [
        themeId,
        withTrailingNewline(renderExampleSvg(exampleThemeConfig(themeId))),
      ]),
    ) as Record<ThemeId, string>,
  };
}

export function writeExamples(root = repoRoot): void {
  const files = exampleFileContents();

  mkdirSync(join(root, 'examples'), { recursive: true });
  mkdirSync(join(root, 'examples/themes'), { recursive: true });
  mkdirSync(join(root, 'examples/multi-svg'), { recursive: true });
  writeFileSync(join(root, exampleFiles.config), files.config);
  writeFileSync(join(root, exampleFiles.typing), files.typing);
  writeFileSync(join(root, exampleFiles.static), files.static);
  writeFileSync(join(root, exampleFiles.matrixConfig), files.matrixConfig);
  writeFileSync(join(root, exampleFiles.matrix), files.matrix);
  writeFileSync(join(root, exampleFiles.ubuntuConfig), files.ubuntuConfig);
  writeFileSync(join(root, exampleFiles.ubuntu), files.ubuntu);
  writeFileSync(
    join(root, exampleFiles.multiSvgMainConfig),
    files.multiSvgMainConfig,
  );
  writeFileSync(
    join(root, exampleFiles.multiSvgLanguagesConfig),
    files.multiSvgLanguagesConfig,
  );
  writeFileSync(join(root, exampleFiles.multiSvgMain), files.multiSvgMain);
  writeFileSync(
    join(root, exampleFiles.multiSvgLanguages),
    files.multiSvgLanguages,
  );
  writeFileSync(
    join(root, exampleFiles.multiSvgWorkflow),
    files.multiSvgWorkflow,
  );

  for (const themeId of themeIds) {
    writeFileSync(join(root, themeExamplePath(themeId)), files.themes[themeId]);
  }
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
