const xmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export function escapeXml(value: string): string {
  return value.replaceAll(
    /[&<>"']/g,
    (character) => xmlEscapes[character] ?? character,
  );
}
