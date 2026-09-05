import { z } from 'zod';

import { defaultThemeId, themeIds } from '../theme/index.js';

const defaultSections = {
  repos: true,
  stars: true,
  streak: true,
  codeChanges: true,
  languages: true,
} as const;

const defaultAnimation = {
  enabled: true,
  mode: 'typing',
} as const;

const defaultUpdate = {
  frequency: 'daily',
} as const;

export const profileConfigSchema = z
  .object({
    sections: z
      .object({
        repos: z.boolean().default(defaultSections.repos),
        stars: z.boolean().default(defaultSections.stars),
        streak: z.boolean().default(defaultSections.streak),
        codeChanges: z.boolean().default(defaultSections.codeChanges),
        languages: z.boolean().default(defaultSections.languages),
      })
      .strict()
      .default(defaultSections),
    theme: z.enum(themeIds).default(defaultThemeId),
    animation: z
      .object({
        enabled: z.boolean().default(defaultAnimation.enabled),
        mode: z
          .enum(['typing', 'sequential', 'none'])
          .default(defaultAnimation.mode),
      })
      .strict()
      .default(defaultAnimation),
    update: z
      .object({
        frequency: z
          .enum(['12h', 'daily', 'weekly', 'monthly', 'manual'])
          .default(defaultUpdate.frequency),
      })
      .strict()
      .default(defaultUpdate),
  })
  .strict();

export type ProfileConfig = z.infer<typeof profileConfigSchema>;

export const defaultProfileConfig: ProfileConfig = profileConfigSchema.parse(
  {},
);
