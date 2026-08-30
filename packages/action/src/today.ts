export function utcCalendarDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
