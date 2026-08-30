import type { ProfileConfig } from '@github-profile-sh/core/config/schema';

export type SectionKey = keyof ProfileConfig['sections'];
export type AnimationMode = ProfileConfig['animation']['mode'];
export type UpdateFrequency = ProfileConfig['update']['frequency'];

export const sectionOptions = [
  { value: 'repos', label: 'Repos' },
  { value: 'stars', label: 'Stars' },
  { value: 'streak', label: 'Current streak' },
  { value: 'codeChanges', label: 'Code changes' },
  { value: 'languages', label: 'Top languages' },
] as const satisfies ReadonlyArray<{ value: SectionKey; label: string }>;

export const animationOptions = [
  { value: 'typing', label: 'Typing' },
  { value: 'sequential', label: 'Sequential' },
  { value: 'none', label: 'None' },
] as const satisfies ReadonlyArray<{ value: AnimationMode; label: string }>;

export const frequencyOptions = [
  { value: '12h', label: 'Every 12 hours' },
  { value: 'daily', label: 'Once a day' },
  { value: 'weekly', label: 'Once a week' },
  { value: 'monthly', label: 'Once a month' },
  { value: 'manual', label: 'Manual only' },
] as const satisfies ReadonlyArray<{ value: UpdateFrequency; label: string }>;

export const defaultSectionKeys = sectionOptions.map((option) => option.value);

export const sectionSummaryLabels: Record<SectionKey, string> = {
  repos: 'repos',
  stars: 'stars',
  streak: 'current streak',
  codeChanges: 'code changes',
  languages: 'top languages',
};

export const frequencySummaryLabels: Record<UpdateFrequency, string> = {
  '12h': 'every 12 hours',
  daily: 'once a day',
  weekly: 'once a week',
  monthly: 'once a month',
  manual: 'manual only',
};

export function frequencyLabel(frequency: UpdateFrequency): string {
  const option = frequencyOptions.find((item) => item.value === frequency);
  return option?.label ?? frequency;
}
