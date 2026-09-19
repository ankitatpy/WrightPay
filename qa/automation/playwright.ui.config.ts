import { defineConfig, devices } from '@playwright/test';
import { config } from './config/env.config';

/**
 * Dedicated Playwright Configuration for WrightPay Frontend / UI Testing.
 */
export default defineConfig({
  testDir: './tests/ui',
  timeout: config.timeout || 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: config.retries,
  workers: process.env.CI ? 2 : 3,
  outputDir: './reports/ui-test-artifacts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/ui-html-report', open: 'never' }],
  ],
  use: {
    baseURL: config.baseUrl || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: config.headless,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
