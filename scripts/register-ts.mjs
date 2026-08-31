// Lets `pnpm examples:generate` import workspace TypeScript without an extra
// runner. Not a general-purpose build pipeline.
import { register } from 'node:module';

register(new globalThis.URL('./ts-hooks.mjs', import.meta.url));
