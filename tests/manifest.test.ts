import { describe, expect, it } from 'vitest';

import { parseOutputsManifest } from '../packages/action/src/manifest/index.js';

describe('parseOutputsManifest', () => {
  it('parses a valid manifest with one profile', () => {
    expect(
      parseOutputsManifest(`
profiles:
  - config: github-profile-sh.yml
    output: github-profile.svg
`),
    ).toEqual({
      profiles: [
        {
          config: 'github-profile-sh.yml',
          output: 'github-profile.svg',
        },
      ],
    });
  });

  it('parses two profiles and preserves order', () => {
    expect(
      parseOutputsManifest(`
profiles:
  - config: github-profile-main.yml
    output: github-profile.svg
  - config: github-profile-languages.yml
    output: github-languages.svg
`),
    ).toEqual({
      profiles: [
        {
          config: 'github-profile-main.yml',
          output: 'github-profile.svg',
        },
        {
          config: 'github-profile-languages.yml',
          output: 'github-languages.svg',
        },
      ],
    });
  });

  it('parses three profiles and preserves non-alphabetical output order', () => {
    expect(
      parseOutputsManifest(`
profiles:
  - config: c.yml
    output: c.svg
  - config: a.yml
    output: a.svg
  - config: b.yml
    output: b.svg
`),
    ).toEqual({
      profiles: [
        { config: 'c.yml', output: 'c.svg' },
        { config: 'a.yml', output: 'a.svg' },
        { config: 'b.yml', output: 'b.svg' },
      ],
    });
  });

  it('allows the same config path with distinct outputs', () => {
    expect(
      parseOutputsManifest(`
profiles:
  - config: profile.yml
    output: profile-dark.svg
  - config: profile.yml
    output: profile-copy.svg
`),
    ).toEqual({
      profiles: [
        { config: 'profile.yml', output: 'profile-dark.svg' },
        { config: 'profile.yml', output: 'profile-copy.svg' },
      ],
    });
  });

  it('rejects an empty profiles array', () => {
    expect(() => parseOutputsManifest('profiles: []')).toThrow(
      'Invalid manifest: profiles must contain at least one profile',
    );
  });

  it('rejects a missing profiles key', () => {
    expect(() => parseOutputsManifest('theme: dark')).toThrow(
      'Invalid manifest:',
    );
  });

  it('rejects a non-object root', () => {
    expect(() => parseOutputsManifest('- config: main.yml')).toThrow(
      'Invalid manifest: root must be an object',
    );
  });

  it('rejects a missing config', () => {
    expect(() =>
      parseOutputsManifest(`
profiles:
  - output: github-profile.svg
`),
    ).toThrow(/profiles\.0\.config:/);
  });

  it('rejects a missing output', () => {
    expect(() =>
      parseOutputsManifest(`
profiles:
  - config: github-profile-sh.yml
`),
    ).toThrow(/profiles\.0\.output:/);
  });

  it('rejects empty strings', () => {
    expect(() =>
      parseOutputsManifest(`
profiles:
  - config: " "
    output: github-profile.svg
`),
    ).toThrow(/profiles\.0\.config:/);

    expect(() =>
      parseOutputsManifest(`
profiles:
  - config: github-profile-sh.yml
    output: ""
`),
    ).toThrow(/profiles\.0\.output:/);
  });

  it('rejects unknown keys', () => {
    expect(() =>
      parseOutputsManifest(`
profiles:
  - config: github-profile-sh.yml
    output: github-profile.svg
    theme: dark
`),
    ).toThrow(/unrecognized key/i);

    expect(() =>
      parseOutputsManifest(`
profiles:
  - config: github-profile-sh.yml
    output: github-profile.svg
mode: multi
`),
    ).toThrow(/unrecognized key/i);
  });

  it('rejects duplicate outputs', () => {
    expect(() =>
      parseOutputsManifest(`
profiles:
  - config: main.yml
    output: profile.svg
  - config: languages.yml
    output: profile.svg
`),
    ).toThrow('Duplicate output path in manifest: profile.svg');
  });
});
