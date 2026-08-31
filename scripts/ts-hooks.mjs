import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.js') && context.parentURL != null) {
    try {
      const candidate = new globalThis.URL(
        specifier.replace(/\.js$/u, '.ts'),
        context.parentURL,
      );

      if (
        candidate.protocol === 'file:' &&
        existsSync(fileURLToPath(candidate))
      ) {
        return nextResolve(candidate.href, context);
      }
    } catch {
      // Fall through to the default resolver.
    }
  }

  return nextResolve(specifier, context);
}
