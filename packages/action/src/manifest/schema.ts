import { z } from 'zod';

const nonEmptyPath = z.string().trim().min(1, 'must be a non-empty string');

export const outputsManifestProfileSchema = z
  .object({
    config: nonEmptyPath,
    output: nonEmptyPath,
  })
  .strict();

export const outputsManifestSchema = z
  .object({
    profiles: z
      .array(outputsManifestProfileSchema)
      .min(1, 'must contain at least one profile'),
  })
  .strict();

export type OutputsManifest = z.infer<typeof outputsManifestSchema>;
export type OutputsManifestProfile = z.infer<
  typeof outputsManifestProfileSchema
>;
