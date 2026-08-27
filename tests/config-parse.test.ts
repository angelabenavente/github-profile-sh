import { describe, expect, it } from 'vitest';

import {
  defaultProfileConfig,
  parseProfileConfig,
} from '../packages/core/src/config/index.js';

describe('parseProfileConfig', () => {
  it('parses a complete valid YAML document', () => {
    const config = parseProfileConfig(`
sections:
  repos: true
  stars: false
  streak: true
  codeChanges: false
  languages: true
theme: dark
animation:
  enabled: false
  mode: sequential
update:
  frequency: weekly
`);

    expect(config).toEqual({
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
        mode: 'sequential',
      },
      update: {
        frequency: 'weekly',
      },
    });
  });

  it('fills omitted top-level keys from a partial document', () => {
    expect(
      parseProfileConfig(`
sections:
  codeChanges: false
`),
    ).toEqual({
      ...defaultProfileConfig,
      sections: {
        ...defaultProfileConfig.sections,
        codeChanges: false,
      },
    });
  });

  it('returns defaults for empty YAML', () => {
    expect(parseProfileConfig('')).toEqual(defaultProfileConfig);
    expect(parseProfileConfig('   \n')).toEqual(defaultProfileConfig);
    expect(parseProfileConfig('null')).toEqual(defaultProfileConfig);
  });

  it('rejects an invalid update frequency', () => {
    expect(() =>
      parseProfileConfig(`
update:
  frequency: hourly
`),
    ).toThrowError(/Invalid profile config:.*update\.frequency/s);
  });

  it('rejects an invalid animation mode', () => {
    expect(() =>
      parseProfileConfig(`
animation:
  mode: instant
`),
    ).toThrowError(/Invalid profile config:.*animation\.mode/s);
  });

  it('rejects a non-boolean section value', () => {
    expect(() =>
      parseProfileConfig(`
sections:
  repos: 42
`),
    ).toThrowError(/Invalid profile config:.*sections\.repos/s);
  });

  it('rejects syntactically invalid YAML', () => {
    expect(() => parseProfileConfig('sections: [\n')).toThrowError(
      /^Invalid YAML:/,
    );
  });

  it('applies nested defaults for partial animation and update blocks', () => {
    expect(
      parseProfileConfig(`
animation:
  mode: sequential
update:
  frequency: weekly
`),
    ).toEqual({
      ...defaultProfileConfig,
      animation: {
        enabled: true,
        mode: 'sequential',
      },
      update: {
        frequency: 'weekly',
      },
    });
  });
});
