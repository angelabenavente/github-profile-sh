export function truncateLanguageName(name: string, maxChars: number): string {
  if (name.length <= maxChars) {
    return name;
  }

  if (maxChars <= 1) {
    return '…';
  }

  return `${name.slice(0, maxChars - 1)}…`;
}
