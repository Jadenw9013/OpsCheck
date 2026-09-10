import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    // The default browser suite must never reach Anthropic. The server under
    // test reports the integration disabled, so no click can bill; the checks
    // that need a "configured" app mock the config endpoint themselves.
    env: { OPSCHECK_AI_ENABLED: 'false', ANTHROPIC_API_KEY: '' },
  },
});
