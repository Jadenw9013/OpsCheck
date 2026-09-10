import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Separate config for the LIVE, BILLABLE smoke test.
 *
 * It is deliberately not reachable from `npm test`, so no default command can
 * ever spend money. Run it explicitly with `npm run smoke:ai`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['smoke/**/*.smoke.ts'],
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(
        new URL('./node_modules/server-only/empty.js', import.meta.url),
      ),
    },
  },
});
