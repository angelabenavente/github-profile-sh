import { intro, isCancel, log, multiselect, select } from '@clack/prompts';

import type { WizardAnswers } from './config.js';
import { buildProfileConfig } from './config.js';
import {
  animationOptions,
  defaultSectionKeys,
  frequencyOptions,
  sectionOptions,
  type AnimationMode,
  type SectionKey,
  type UpdateFrequency,
} from './options.js';

export class SetupCancelledError extends Error {
  constructor() {
    super('Setup cancelled.');
    this.name = 'SetupCancelledError';
  }
}

export class NonInteractiveError extends Error {
  constructor() {
    super('init requires an interactive terminal.');
    this.name = 'NonInteractiveError';
  }
}

export type WizardCollector = () => Promise<WizardAnswers>;

function requireAnswer<T>(value: T | symbol): T {
  if (isCancel(value)) {
    throw new SetupCancelledError();
  }

  return value;
}

export async function collectWizardAnswers(): Promise<WizardAnswers> {
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) {
    throw new NonInteractiveError();
  }

  intro('github-profile.sh');
  log.message('Configure your GitHub profile terminal.');

  const sections = requireAnswer(
    await multiselect<SectionKey>({
      message: 'What do you want to show?',
      options: [...sectionOptions],
      initialValues: defaultSectionKeys,
      required: true,
    }),
  );

  const animation = requireAnswer(
    await select<AnimationMode>({
      message: 'Animation',
      options: [...animationOptions],
      initialValue: 'typing',
    }),
  );

  const frequency = requireAnswer(
    await select<UpdateFrequency>({
      message: 'Update frequency',
      options: [...frequencyOptions],
      initialValue: 'daily',
    }),
  );

  return { sections, animation, frequency };
}

export const defaultOverwrite = false;

export async function promptOverwrite(message: string): Promise<boolean> {
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) {
    throw new NonInteractiveError();
  }

  return requireAnswer(
    await select<boolean>({
      message,
      options: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' },
      ],
      initialValue: defaultOverwrite,
    }),
  );
}

export async function promptForConfig(
  collect: WizardCollector = collectWizardAnswers,
) {
  return buildProfileConfig(await collect());
}
