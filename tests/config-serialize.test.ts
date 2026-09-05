import { describe, expect, it } from 'vitest';

import { buildProfileConfig } from '../packages/cli/src/wizard/config.js';
import {
  defaultProfileConfig,
  parseProfileConfig,
  serializeProfileConfig,
} from '../packages/core/src/config/index.js';

const completeConfig = {
  sections: {
    repos: true,
    stars: true,
    streak: true,
    codeChanges: false,
    languages: true,
  },
  theme: 'dark' as const,
  animation: {
    enabled: true,
    mode: 'typing' as const,
  },
  update: {
    frequency: 'daily' as const,
  },
};

const expectedCompleteYaml = `sections:
  repos: true
  stars: true
  streak: true
  codeChanges: false
  languages: true

theme: dark

animation:
  enabled: true
  mode: typing

update:
  frequency: daily
`;

describe('serializeProfileConfig', () => {
  it('serializes a complete config as readable YAML', () => {
    expect(serializeProfileConfig(completeConfig)).toBe(expectedCompleteYaml);
    expect(serializeProfileConfig(completeConfig)).toContain('\n  repos: true');
    expect(serializeProfileConfig(completeConfig)).not.toMatch(/\{|\}/);
  });

  it('ends with a newline', () => {
    expect(serializeProfileConfig(completeConfig).endsWith('\n')).toBe(true);
  });

  it('is deterministic', () => {
    expect(serializeProfileConfig(completeConfig)).toBe(
      serializeProfileConfig(completeConfig),
    );
    expect(serializeProfileConfig(defaultProfileConfig)).toBe(
      serializeProfileConfig(defaultProfileConfig),
    );
  });

  it('round-trips through parseProfileConfig', () => {
    expect(parseProfileConfig(serializeProfileConfig(completeConfig))).toEqual(
      completeConfig,
    );
    expect(
      parseProfileConfig(serializeProfileConfig(defaultProfileConfig)),
    ).toEqual(defaultProfileConfig);
    expect(
      parseProfileConfig(
        serializeProfileConfig(
          buildProfileConfig({
            sections: ['repos', 'languages'],
            animation: 'none',
            frequency: 'manual',
          }),
        ),
      ),
    ).toEqual({
      sections: {
        repos: true,
        stars: false,
        streak: false,
        codeChanges: false,
        languages: true,
      },
      theme: 'dark',
      animation: {
        enabled: false,
        mode: 'none',
      },
      update: {
        frequency: 'manual',
      },
    });
  });
});
