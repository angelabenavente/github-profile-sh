export const defaultMetricLineWidth = 32;

function formatScaled(value: number): { amount: number; text: string } {
  const amount = Math.round(value * 10) / 10;
  const text = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);

  return { amount, text };
}

export function formatCompactNumber(value: number): string {
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);

  if (absolute < 1000) {
    return `${sign}${Math.round(absolute)}`;
  }

  const thousands = formatScaled(absolute / 1000);

  if (thousands.amount < 1000) {
    return `${sign}${thousands.text}k`;
  }

  return `${sign}${formatScaled(absolute / 1_000_000).text}m`;
}

export function formatMetricLine(
  label: string,
  value: string,
  width = defaultMetricLineWidth,
): string {
  const dots = Math.max(1, width - label.length - value.length);

  return `${label}${'.'.repeat(dots)}${value}`;
}

export function formatStreak(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}

export function formatCodeChanges(total: number, complete: boolean): string {
  const value = formatCompactNumber(total);

  return complete ? value : `~${value}`;
}
