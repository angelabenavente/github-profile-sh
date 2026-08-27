import { describe, expect, it } from 'vitest';

import {
  defaultProfileConfig,
  profileConfigSchema,
} from '../packages/core/src/config/index.js';

const updateFrequencies = [
  '12h',
  'daily',
  'weekly',
  'monthly',
  'manual',
] as const;

const animationModes = ['typing', 'sequential', 'none'] as const;

describe('profileConfigSchema', () => {
  it('accepts a valid configuration', () => {
    const config = {
      sections: {
        repos: true,
        stars: false,
        streak: true,
        codeChanges: false,
        languages: true,
      },
      theme: 'dark',
      animation: {
        enabled: false,
        mode: 'sequential' as const,
      },
      update: {
        frequency: 'weekly' as const,
      },
    };

    expect(profileConfigSchema.parse(config)).toEqual(config);
  });

  it('accepts every allowed update frequency', () => {
    for (const frequency of updateFrequencies) {
      expect(
        profileConfigSchema.parse({
          ...defaultProfileConfig,
          update: { frequency },
        }).update.frequency,
      ).toBe(frequency);
    }
  });

  it('rejects an invalid update frequency', () => {
    const result = profileConfigSchema.safeParse({
      ...defaultProfileConfig,
      update: { frequency: 'hourly' },
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid animation mode', () => {
    const result = profileConfigSchema.safeParse({
      ...defaultProfileConfig,
      animation: { enabled: true, mode: 'instant' },
    });

    expect(result.success).toBe(false);
  });

  it('applies defaults when values are omitted', () => {
    expect(profileConfigSchema.parse({})).toEqual(defaultProfileConfig);
  });

  it('accepts every animation mode', () => {
    for (const mode of animationModes) {
      expect(
        profileConfigSchema.parse({
          ...defaultProfileConfig,
          animation: { enabled: true, mode },
        }).animation.mode,
      ).toBe(mode);
    }
  });

  it('requires the v0.1 sections and rejects unknown ones', () => {
    expect(defaultProfileConfig.sections).toEqual({
      repos: true,
      stars: true,
      streak: true,
      codeChanges: true,
      languages: true,
    });

    const result = profileConfigSchema.safeParse({
      ...defaultProfileConfig,
      sections: {
        ...defaultProfileConfig.sections,
        followers: true,
      },
    });

    expect(result.success).toBe(false);
  });
});

describe('defaultProfileConfig', () => {
  it('uses the v0.1 defaults', () => {
    expect(defaultProfileConfig).toEqual({
      sections: {
        repos: true,
        stars: true,
        streak: true,
        codeChanges: true,
        languages: true,
      },
      theme: 'dark',
      animation: {
        enabled: true,
        mode: 'typing',
      },
      update: {
        frequency: 'daily',
      },
    });
  });
});
