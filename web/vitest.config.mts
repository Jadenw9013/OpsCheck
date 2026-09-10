import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Server modules guard themselves with `server-only`, which throws unless
      // the bundler picks its react-server condition. Tests run in plain Node,
      // so they resolve the package's own no-op build instead. This is a
      // test-only shim: the real guard still protects the client bundle, and
      // the build fails if a client component imports a server module.
      'server-only': fileURLToPath(
        new URL('./node_modules/server-only/empty.js', import.meta.url),
      ),
    },
  },
});
