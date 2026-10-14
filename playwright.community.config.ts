import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/e2e',
  testMatch: 'community.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3191',
    ...devices['Desktop Chrome'],
    channel: process.env.COMMUNITY_BROWSER_CHANNEL || undefined,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: process.env.COMMUNITY_TEST_PRODUCTION === '1'
      ? 'node node_modules/next/dist/bin/next start --port 3191'
      : 'node node_modules/next/dist/bin/next dev --webpack --port 3191',
    url: 'http://127.0.0.1:3191/community',
    timeout: 180000,
    reuseExistingServer: !process.env.CI,
    env: { DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/community_test', JWT_SECRET: 'community-browser-tests-only-not-a-production-secret', NEXT_TELEMETRY_DISABLED: '1' },
  },
})
