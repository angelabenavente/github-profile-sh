import type { ProfileConfig } from '@github-profile-sh/core/config/schema';

import { GITHUB_PROFILE_ACTION } from './action-ref.js';

export type UpdateFrequency = ProfileConfig['update']['frequency'];

export const WORKFLOW_RELATIVE_PATH = '.github/workflows/github-profile-sh.yml';
export const PROFILE_SVG_FILENAME = 'github-profile.svg';
export const PROFILE_COMMIT_MESSAGE = 'chore(profile): update github stats';
export const PROFILE_CONFIG_INPUT = 'github-profile-sh.yml';

export const workflowCronByFrequency = {
  '12h': '0 */12 * * *',
  daily: '0 3 * * *',
  weekly: '0 3 * * 1',
  monthly: '0 3 1 * *',
} as const satisfies Record<Exclude<UpdateFrequency, 'manual'>, string>;

export function cronForFrequency(
  frequency: UpdateFrequency,
): string | undefined {
  if (frequency === 'manual') {
    return undefined;
  }

  return workflowCronByFrequency[frequency];
}

export function generateWorkflow(frequency: UpdateFrequency): string {
  return [
    'name: Update github-profile.sh',
    '',
    'on:',
    '  workflow_dispatch:',
    ...scheduleLines(frequency),
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
    '      - name: Generate profile',
    `        uses: ${GITHUB_PROFILE_ACTION}`,
    '        with:',
    `          config: ${PROFILE_CONFIG_INPUT}`,
    `          output: ${PROFILE_SVG_FILENAME}`,
    '',
    '      - name: Commit profile',
    '        run: |',
    '          git config user.name "github-actions[bot]"',
    '          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"',
    `          git add ${PROFILE_SVG_FILENAME}`,
    `          git diff --cached --quiet || git commit -m "${PROFILE_COMMIT_MESSAGE}"`,
    '          git push',
    '',
  ].join('\n');
}

function scheduleLines(frequency: UpdateFrequency): string[] {
  const cron = cronForFrequency(frequency);
  if (cron == null) {
    return [];
  }

  return ['  schedule:', `    - cron: "${cron}"`];
}
