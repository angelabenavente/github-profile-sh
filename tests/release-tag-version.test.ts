import { describe, expect, it } from 'vitest';

import {
  assertTagMatchesCliVersion,
  readCliPackageVersion,
} from '../scripts/release/assert-tag-version.js';
import { packageVersionFromReleaseTag } from '../scripts/release/tag-version.js';

describe('packageVersionFromReleaseTag', () => {
  it('strips the v prefix from a release tag', () => {
    expect(packageVersionFromReleaseTag('v0.1.0')).toBe('0.1.0');
    expect(packageVersionFromReleaseTag('v1.2.3')).toBe('1.2.3');
  });

  it('rejects tags that are not vX.Y.Z', () => {
    expect(() => packageVersionFromReleaseTag('0.1.0')).toThrow(
      /Unexpected release tag/,
    );
    expect(() => packageVersionFromReleaseTag('v1')).toThrow(
      /Unexpected release tag/,
    );
    expect(() => packageVersionFromReleaseTag('v0.1')).toThrow(
      /Unexpected release tag/,
    );
    expect(() => packageVersionFromReleaseTag('v0.1.0-rc.1')).toThrow(
      /Unexpected release tag/,
    );
    expect(() => packageVersionFromReleaseTag('release-0.1.0')).toThrow(
      /Unexpected release tag/,
    );
  });
});

describe('assertTagMatchesCliVersion', () => {
  it('accepts a matching release tag', () => {
    expect(() => assertTagMatchesCliVersion('v0.1.0', '0.1.0')).not.toThrow();
  });

  it('rejects a tag that does not match the package version', () => {
    expect(() => assertTagMatchesCliVersion('v0.1.1', '0.1.0')).toThrow(
      'Tag v0.1.1 does not match CLI package version 0.1.0.',
    );
  });
});

describe('CLI package version', () => {
  it('is the first public release version', () => {
    expect(readCliPackageVersion()).toBe('0.1.0');
  });
});
