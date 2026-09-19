import { defineConfig, devices } from '@playwright/test';
import { config } from './config/env.config';

/**
 * Dedicated Playwright configuration for Known Defect Regression Suite.
 * Exercises active, unresolved findings (WP-QA-001, WP-QA-003, WP-QA-005, WP-QA-007)
 * using test.fail() to assert expected behavior without disturbing the 277-test canonical baseline.
 */
export default defineConfig({
  testDir: './tests/defects',
  timeout: config.timeout,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Run sequentially for clear, isolated diagnostic logs
  outputDir: './reports/defect-artifacts',
  reporter: [
    ['list'],
    ['json', { outputFile: 'reports/defect-test-results.json' }],
    ['html', { outputFolder: 'reports/defect-html-report', open: 'never' }],
  ],
  use: {
    baseURL: config.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: config.headless,
  },
  projects: [
    {
      name: 'defects-regression',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
