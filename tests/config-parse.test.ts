import { describe, expect, it } from 'vitest';

import {
  defaultProfileConfig,
  parseProfileConfig,
} from '../packages/core/src/config/index.js';

const expectedDefaults = {
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
} as const;

describe('parseProfileConfig', () => {
  describe('defaults', () => {
    it('produces the full v0.1 defaults from an empty document', () => {
      expect(parseProfileConfig('')).toEqual(expectedDefaults);
      expect(parseProfileConfig('   \n')).toEqual(expectedDefaults);
      expect(parseProfileConfig('null')).toEqual(expectedDefaults);
    });
  });

  describe('complete documents', () => {
    it('parses a complete valid YAML document', () => {
      expect(
        parseProfileConfig(`
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
`),
      ).toEqual({
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
  });

  describe('partial documents', () => {
    it('keeps remaining section defaults when one section is overridden', () => {
      expect(
        parseProfileConfig(`
sections:
  codeChanges: false
`),
      ).toEqual({
        ...expectedDefaults,
        sections: {
          ...expectedDefaults.sections,
          codeChanges: false,
        },
      });
    });

    it('keeps remaining animation defaults when only mode is set', () => {
      expect(
        parseProfileConfig(`
animation:
  mode: sequential
`),
      ).toEqual({
        ...expectedDefaults,
        animation: {
          enabled: true,
          mode: 'sequential',
        },
      });
    });

    it('keeps remaining update defaults when only frequency is set', () => {
      expect(
        parseProfileConfig(`
update:
  frequency: weekly
`),
      ).toEqual({
        ...expectedDefaults,
        update: {
          frequency: 'weekly',
        },
      });
    });

    it.each(['sections: {}', 'animation: {}', 'update: {}'] as const)(
      'fills nested defaults for %s',
      (yaml) => {
        expect(parseProfileConfig(yaml)).toEqual(expectedDefaults);
      },
    );
  });

  describe('valid frequencies', () => {
    it.each(['12h', 'daily', 'weekly', 'monthly', 'manual'] as const)(
      'accepts %s',
      (frequency) => {
        expect(
          parseProfileConfig(`
update:
  frequency: ${frequency}
`).update.frequency,
        ).toBe(frequency);
      },
    );
  });

  describe('valid animation modes', () => {
    it.each(['typing', 'sequential', 'none'] as const)('accepts %s', (mode) => {
      expect(
        parseProfileConfig(`
animation:
  mode: ${mode}
`).animation.mode,
      ).toBe(mode);
    });
  });

  describe('invalid types', () => {
    it('rejects a string boolean in sections', () => {
      expect(() =>
        parseProfileConfig(`
sections:
  stars: "yes"
`),
      ).toThrowError(/Invalid profile config:.*sections\.stars/s);
    });

    it('rejects a numeric update frequency', () => {
      expect(() =>
        parseProfileConfig(`
update:
  frequency: 123
`),
      ).toThrowError(/Invalid profile config:.*update\.frequency/s);
    });

    it('rejects a string boolean for animation.enabled', () => {
      expect(() =>
        parseProfileConfig(`
animation:
  enabled: "true"
`),
      ).toThrowError(/Invalid profile config:.*animation\.enabled/s);
    });

    it('rejects YAML 1.2 unquoted yes as a boolean', () => {
      expect(() =>
        parseProfileConfig(`
sections:
  stars: yes
`),
      ).toThrowError(/Invalid profile config:.*sections\.stars/s);
    });

    it('rejects a numeric theme', () => {
      expect(() =>
        parseProfileConfig(`
theme: 1
`),
      ).toThrowError(/Invalid profile config:.*theme/s);
    });
  });

  describe('unknown properties', () => {
    it('rejects an unknown section', () => {
      expect(() =>
        parseProfileConfig(`
sections:
  followers: true
`),
      ).toThrowError(/Invalid profile config:/);
    });

    it('rejects an unknown top-level option', () => {
      expect(() =>
        parseProfileConfig(`
unknownOption: true
`),
      ).toThrowError(/Invalid profile config:/);
    });

    it('rejects an unknown animation option', () => {
      expect(() =>
        parseProfileConfig(`
animation:
  bounce: true
`),
      ).toThrowError(/Invalid profile config:.*animation/s);
    });

    it('rejects an unknown update option', () => {
      expect(() =>
        parseProfileConfig(`
update:
  cron: daily
`),
      ).toThrowError(/Invalid profile config:.*update/s);
    });
  });

  describe('invalid documents', () => {
    it('rejects an unknown update frequency', () => {
      expect(() =>
        parseProfileConfig(`
update:
  frequency: hourly
`),
      ).toThrowError(/Invalid profile config:.*update\.frequency/s);
    });

    it('rejects an unknown animation mode', () => {
      expect(() =>
        parseProfileConfig(`
animation:
  mode: instant
`),
      ).toThrowError(/Invalid profile config:.*animation\.mode/s);
    });

    it('rejects a root array', () => {
      expect(() => parseProfileConfig('- repos: true\n')).toThrowError(
        /^Invalid profile config:/,
      );
    });

    it('rejects a root string', () => {
      expect(() => parseProfileConfig('dark\n')).toThrowError(
        /^Invalid profile config:/,
      );
    });

    it('rejects a root number', () => {
      expect(() => parseProfileConfig('42\n')).toThrowError(
        /^Invalid profile config:/,
      );
    });

    it('rejects nested null in place of an object', () => {
      expect(() =>
        parseProfileConfig(`
sections: null
`),
      ).toThrowError(/Invalid profile config:.*sections/s);
    });

    it('rejects syntactically invalid YAML', () => {
      expect(() => parseProfileConfig('sections: [\n')).toThrowError(
        /^Invalid YAML:/,
      );
    });
  });

  describe('explicit values', () => {
    it('does not replace an explicit false with the default', () => {
      expect(
        parseProfileConfig(`
sections:
  repos: false
`).sections.repos,
      ).toBe(false);
    });

    it('keeps an explicit animation.enabled false', () => {
      expect(
        parseProfileConfig(`
animation:
  enabled: false
`).animation.enabled,
      ).toBe(false);
    });
  });

  describe('shared defaults', () => {
    it('does not mutate defaultProfileConfig when a parsed config is changed', () => {
      const parsed = parseProfileConfig('');

      parsed.sections.repos = false;
      parsed.animation.mode = 'none';
      parsed.theme = 'light';

      expect(defaultProfileConfig).toEqual(expectedDefaults);
      expect(parseProfileConfig('').sections.repos).toBe(true);
    });

    it('does not reuse nested objects from defaultProfileConfig', () => {
      const parsed = parseProfileConfig('');

      expect(parsed).not.toBe(defaultProfileConfig);
      expect(parsed.sections).not.toBe(defaultProfileConfig.sections);
      expect(parsed.animation).not.toBe(defaultProfileConfig.animation);
      expect(parsed.update).not.toBe(defaultProfileConfig.update);
    });
  });
});
