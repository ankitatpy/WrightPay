import { test as base, APIRequestContext } from '@playwright/test';
import { config } from '../config/env.config';
import {
  AuthApi,
  UsersApi,
  WalletApi,
  CardsApi,
  BeneficiariesApi,
  TransfersApi,
  TransactionsApi,
  ExchangeRatesApi,
} from '../api';
import { generateTestUserData, TestUserData } from '../test-data/user.factory';
import { dbClient, DbClient } from '../database/db-client';
import { redisClient, RedisClient } from '../redis/redis-client';
import { transferQueueClient, TransferQueueClient } from '../queues/queue-client';

export interface AuthenticatedUserSession {
  user: {
    id: string;
    email: string;
    name: string;
    password: string;
  };
  token: string;
  authContext: APIRequestContext;
  api: {
    auth: AuthApi;
    users: UsersApi;
    wallet: WalletApi;
    cards: CardsApi;
    beneficiaries: BeneficiariesApi;
    transfers: TransfersApi;
    transactions: TransactionsApi;
    exchangeRates: ExchangeRatesApi;
  };
}

export interface ApiFixtures {
  /** Unauthenticated API request context pointed at API_BASE_URL */
  apiContext: APIRequestContext;
  /** Unauthenticated AuthApi client */
  authApi: AuthApi;
  /** Unauthenticated ExchangeRatesApi client */
  exchangeRatesApi: ExchangeRatesApi;
  /** Fully provisioned and authenticated user session */
  authUser: AuthenticatedUserSession;
  /** Database test client singleton */
  db: DbClient;
  /** Redis test client singleton */
  redis: RedisClient;
  /** BullMQ transfers queue client singleton */
  queue: TransferQueueClient;
}

const getNormalizedApiBaseUrl = (): string => {
  return config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
};

export const test = base.extend<ApiFixtures>({
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: getNormalizedApiBaseUrl(),
    });
    await use(context);
    await context.dispose();
  },

  authApi: async ({ apiContext }, use) => {
    await use(new AuthApi(apiContext));
  },

  exchangeRatesApi: async ({ apiContext }, use) => {
    await use(new ExchangeRatesApi(apiContext));
  },

  authUser: async ({ playwright, apiContext }, use) => {
    const authApi = new AuthApi(apiContext);
    const testUser = generateTestUserData();

    // 1. Real API Signup
    const signupRes = await authApi.signup(testUser);
    if (!signupRes.ok()) {
      const errorText = await signupRes.text();
      throw new Error(`[AuthFixture] Signup failed for ${testUser.email} with status ${signupRes.status()}: ${errorText}`);
    }
    const signupData = await signupRes.json();
    const userId = signupData.userId;

    // 2. Real API Email Verification
    // Default development verification code is 123456
    let verifyRes = await authApi.verifyEmail({
      email: testUser.email,
      code: '123456',
    });

    if (!verifyRes.ok()) {
      // If code 123456 failed (e.g. In non-dev environment), retrieve generated OTP from database
      const row = await dbClient.queryOne<{ verificationCode?: string; verification_code?: string }>(
        'SELECT "verificationCode" FROM email_verifications WHERE email = $1 ORDER BY "createdAt" DESC LIMIT 1',
        [testUser.email],
      );
      const dbCode = row?.verificationCode || row?.verification_code;
      if (dbCode) {
        verifyRes = await authApi.verifyEmail({
          email: testUser.email,
          code: dbCode,
        });
      }
    }

    if (!verifyRes.ok()) {
      const errorText = await verifyRes.text();
      throw new Error(`[AuthFixture] Email verification failed for ${testUser.email} with status ${verifyRes.status()}: ${errorText}`);
    }

    // 3. Real API Login
    const loginRes = await authApi.login({
      email: testUser.email,
      password: testUser.password,
    });

    if (!loginRes.ok()) {
      const errorText = await loginRes.text();
      throw new Error(`[AuthFixture] Login failed for ${testUser.email} with status ${loginRes.status()}: ${errorText}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.access_token;
    if (!token) {
      throw new Error(`[AuthFixture] Login response did not contain access_token`);
    }

    // 4. Create Authenticated API Request Context
    const authContext = await playwright.request.newContext({
      baseURL: getNormalizedApiBaseUrl(),
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    const session: AuthenticatedUserSession = {
      user: {
        id: userId,
        email: testUser.email,
        name: testUser.fullName,
        password: testUser.password,
      },
      token,
      authContext,
      api: {
        auth: new AuthApi(authContext),
        users: new UsersApi(authContext),
        wallet: new WalletApi(authContext),
        cards: new CardsApi(authContext),
        beneficiaries: new BeneficiariesApi(authContext),
        transfers: new TransfersApi(authContext),
        transactions: new TransactionsApi(authContext),
        exchangeRates: new ExchangeRatesApi(authContext),
      },
    };

    await use(session);

    // Teardown
    await authContext.dispose();
  },

  db: async ({}, use) => {
    await use(dbClient);
  },

  redis: async ({}, use) => {
    await use(redisClient);
  },

  queue: async ({}, use) => {
    await use(transferQueueClient);
  },
});

export { expect } from '@playwright/test';
