import type { ContributionDay } from './types.js';

function previousCalendarDay(date: string): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const utc = new Date(Date.UTC(year, month - 1, day - 1));

  return [
    String(utc.getUTCFullYear()),
    String(utc.getUTCMonth() + 1).padStart(2, '0'),
    String(utc.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function countByDate(
  days: readonly ContributionDay[],
): ReadonlyMap<string, number> {
  return new Map(days.map((day) => [day.date, day.count]));
}

export function calculateCurrentStreak(
  days: readonly ContributionDay[],
  today: string,
): number {
  const counts = countByDate(days);
  const countOn = (date: string): number => counts.get(date) ?? 0;

  let cursor = countOn(today) > 0 ? today : previousCalendarDay(today);

  if (countOn(cursor) === 0) {
    return 0;
  }

  let streak = 0;

  while (countOn(cursor) > 0) {
    streak += 1;
    cursor = previousCalendarDay(cursor);
  }

  return streak;
}
