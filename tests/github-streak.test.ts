import { describe, expect, it } from 'vitest';

import {
  calculateCurrentStreak,
  type ContributionDay,
} from '../packages/core/src/github/index.js';

const today = '2026-08-27';

function days(
  ...entries: ReadonlyArray<readonly [date: string, count: number]>
): ContributionDay[] {
  return entries.map(([date, count]) => ({ date, count }));
}

describe('calculateCurrentStreak', () => {
  it('includes today when today has contributions', () => {
    expect(
      calculateCurrentStreak(days(['2026-08-26', 1], ['2026-08-27', 2]), today),
    ).toBe(2);
  });

  it('keeps yesterday’s streak when today has no contributions', () => {
    expect(
      calculateCurrentStreak(
        days(
          ['2026-08-24', 2],
          ['2026-08-25', 4],
          ['2026-08-26', 1],
          ['2026-08-27', 0],
        ),
        today,
      ),
    ).toBe(3);
  });

  it('returns 0 when today and yesterday have no contributions', () => {
    expect(
      calculateCurrentStreak(
        days(
          ['2026-08-24', 2],
          ['2026-08-25', 4],
          ['2026-08-26', 0],
          ['2026-08-27', 0],
        ),
        today,
      ),
    ).toBe(0);
  });

  it('counts several consecutive contribution days', () => {
    expect(
      calculateCurrentStreak(
        days(
          ['2026-08-23', 1],
          ['2026-08-24', 1],
          ['2026-08-25', 1],
          ['2026-08-26', 1],
          ['2026-08-27', 1],
        ),
        today,
      ),
    ).toBe(5);
  });

  it('stops at a day without contributions', () => {
    expect(
      calculateCurrentStreak(
        days(
          ['2026-08-24', 5],
          ['2026-08-25', 0],
          ['2026-08-26', 2],
          ['2026-08-27', 1],
        ),
        today,
      ),
    ).toBe(2);
  });

  it('counts a single contribution day', () => {
    expect(calculateCurrentStreak(days(['2026-08-27', 1]), today)).toBe(1);
  });

  it('returns 0 when no day has contributions', () => {
    expect(
      calculateCurrentStreak(days(['2026-08-26', 0], ['2026-08-27', 0]), today),
    ).toBe(0);
  });

  it('returns 0 for an empty calendar', () => {
    expect(calculateCurrentStreak([], today)).toBe(0);
  });

  it('continues a streak across a month boundary', () => {
    expect(
      calculateCurrentStreak(
        days(['2026-07-31', 1], ['2026-08-01', 2]),
        '2026-08-01',
      ),
    ).toBe(2);
  });

  it('continues a streak across a year boundary', () => {
    expect(
      calculateCurrentStreak(
        days(['2026-12-30', 1], ['2026-12-31', 3], ['2027-01-01', 2]),
        '2027-01-01',
      ),
    ).toBe(3);
  });

  it('treats a missing today as zero and continues from yesterday', () => {
    expect(
      calculateCurrentStreak(
        days(['2026-08-24', 2], ['2026-08-25', 4], ['2026-08-26', 1]),
        today,
      ),
    ).toBe(3);
  });

  it('returns 0 when today is missing and yesterday has no contributions', () => {
    expect(
      calculateCurrentStreak(days(['2026-08-25', 4], ['2026-08-26', 0]), today),
    ).toBe(0);
  });
});
