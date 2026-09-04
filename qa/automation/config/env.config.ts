import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file if present
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export type EnvironmentType = 'local' | 'test' | 'staging' | 'production';

export interface TestConfig {
  env: EnvironmentType;
  baseUrl: string;
  apiBaseUrl: string;
  headless: boolean;
  timeout: number;
  retries: number;
  workers: number | undefined;
}

const getEnv = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

const currentEnv = (getEnv('TEST_ENV', 'local').toLowerCase() as EnvironmentType);

export const config: TestConfig = {
  env: currentEnv,
  baseUrl: getEnv('BASE_URL', 'http://localhost:3000'),
  apiBaseUrl: getEnv('API_BASE_URL', 'http://localhost:4000/api'),
  headless: getEnv('HEADLESS', 'true') !== 'false',
  timeout: parseInt(getEnv('TEST_TIMEOUT', '30000'), 10),
  retries: parseInt(getEnv('TEST_RETRIES', currentEnv === 'local' ? '0' : '2'), 10),
  workers: process.env.CI ? 2 : undefined,
};
