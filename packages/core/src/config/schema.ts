import { z } from 'zod';

export const profileConfigSchema = z
  .object({
    sections: z
      .object({
        repos: z.boolean(),
        stars: z.boolean(),
        streak: z.boolean(),
        codeChanges: z.boolean(),
        languages: z.boolean(),
      })
      .strict()
      .default({
        repos: true,
        stars: true,
        streak: true,
        codeChanges: true,
        languages: true,
      }),
    theme: z.string().default('dark'),
    animation: z
      .object({
        enabled: z.boolean(),
        mode: z.enum(['typing', 'sequential', 'none']),
      })
      .strict()
      .default({
        enabled: true,
        mode: 'typing',
      }),
    update: z
      .object({
        frequency: z.enum(['12h', 'daily', 'weekly', 'monthly', 'manual']),
      })
      .strict()
      .default({
        frequency: 'daily',
      }),
  })
  .strict();

export type ProfileConfig = z.infer<typeof profileConfigSchema>;

export const defaultProfileConfig: ProfileConfig = profileConfigSchema.parse(
  {},
);
