import type { ProfileConfig } from '@github-profile-sh/core/config/schema';
import { profileConfigSchema } from '@github-profile-sh/core/config/schema';

import type { AnimationMode, SectionKey, UpdateFrequency } from './options.js';
import {
  defaultSectionKeys,
  frequencySummaryLabels,
  sectionOptions,
  sectionSummaryLabels,
} from './options.js';

export type WizardAnswers = {
  sections: SectionKey[];
  animation: AnimationMode;
  frequency: UpdateFrequency;
};

export const defaultWizardAnswers: WizardAnswers = {
  sections: defaultSectionKeys,
  animation: 'typing',
  frequency: 'daily',
};

export class InvalidWizardAnswersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidWizardAnswersError';
  }
}

export function buildProfileConfig(answers: WizardAnswers): ProfileConfig {
  if (answers.sections.length === 0) {
    throw new InvalidWizardAnswersError('Select at least one metric.');
  }

  const selected = new Set(answers.sections);

  return profileConfigSchema.parse({
    sections: {
      repos: selected.has('repos'),
      stars: selected.has('stars'),
      streak: selected.has('streak'),
      codeChanges: selected.has('codeChanges'),
      languages: selected.has('languages'),
    },
    theme: 'dark',
    animation: {
      enabled: answers.animation !== 'none',
      mode: answers.animation,
    },
    update: {
      frequency: answers.frequency,
    },
  });
}

export function formatSummary(config: ProfileConfig): string {
  const sections = sectionOptions.flatMap((option) =>
    config.sections[option.value]
      ? [`  ${sectionSummaryLabels[option.value]}`]
      : [],
  );

  return [
    'Configuration ready.',
    '',
    'Sections',
    ...sections,
    '',
    'Animation',
    `  ${config.animation.mode}`,
    '',
    'Update',
    `  ${frequencySummaryLabels[config.update.frequency]}`,
  ].join('\n');
}
