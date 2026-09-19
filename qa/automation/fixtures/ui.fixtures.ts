import { test as base, expect, Page, APIRequestContext } from '@playwright/test';
import { AuthApi } from '../api/auth.api';
import { BeneficiariesApi } from '../api/beneficiaries.api';
import { CardsApi } from '../api/cards.api';
import { TransfersApi } from '../api/transfers.api';
import { WalletApi } from '../api/wallet.api';
import { TransactionsApi } from '../api/transactions.api';
import { ExchangeRatesApi } from '../api/exchange-rates.api';
import { generateTestUserData, TestUserData } from '../test-data/user.factory';
import { LandingPage } from '../pages/landing.page';
import { LoginPage } from '../pages/login.page';
import { SignupPage } from '../pages/signup.page';
import { DashboardPage } from '../pages/dashboard.page';
import { BeneficiariesPage } from '../pages/beneficiaries.page';
import { CardsPage } from '../pages/cards.page';
import { SendMoneyPage } from '../pages/send-money.page';
import { TransactionsPage } from '../pages/transactions.page';
import { config } from '../config/env.config';

export interface ProvisionedUser {
  id: string;
  email: string;
  name: string;
  password: string;
  token: string;
}

export interface UiFixtures {
  landingPage: LandingPage;
  loginPage: LoginPage;
  signupPage: SignupPage;
  dashboardPage: DashboardPage;
  beneficiariesPage: BeneficiariesPage;
  cardsPage: CardsPage;
  sendMoneyPage: SendMoneyPage;
  transactionsPage: TransactionsPage;
  createTestUser: (overrides?: Partial<TestUserData>) => Promise<ProvisionedUser>;
  authenticatedUser: {
    page: Page;
    user: ProvisionedUser;
    dashboardPage: DashboardPage;
    beneficiariesPage: BeneficiariesPage;
    cardsPage: CardsPage;
    sendMoneyPage: SendMoneyPage;
    transactionsPage: TransactionsPage;
    apiContext: APIRequestContext;
    beneficiariesApi: BeneficiariesApi;
    cardsApi: CardsApi;
    transfersApi: TransfersApi;
    walletApi: WalletApi;
    transactionsApi: TransactionsApi;
    exchangeRatesApi: ExchangeRatesApi;
  };
}

const getNormalizedApiBaseUrl = (): string => {
  return config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
};

export const test = base.extend<UiFixtures>({
  landingPage: async ({ page }, use) => {
    await use(new LandingPage(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  beneficiariesPage: async ({ page }, use) => {
    await use(new BeneficiariesPage(page));
  },

  cardsPage: async ({ page }, use) => {
    await use(new CardsPage(page));
  },

  sendMoneyPage: async ({ page }, use) => {
    await use(new SendMoneyPage(page));
  },

  transactionsPage: async ({ page }, use) => {
    await use(new TransactionsPage(page));
  },

  createTestUser: async ({ playwright }, use) => {
    const apiContext = await playwright.request.newContext({
      baseURL: getNormalizedApiBaseUrl(),
    });
    const authApi = new AuthApi(apiContext);

    const helper = async (overrides?: Partial<TestUserData>): Promise<ProvisionedUser> => {
      const testUser = generateTestUserData(overrides);

      // 1. Signup
      const signupRes = await authApi.signup(testUser);
      if (!signupRes.ok()) {
        const text = await signupRes.text();
        throw new Error(`Signup failed: ${signupRes.status()} - ${text}`);
      }
      const signupData = await signupRes.json();
      const userId = signupData.userId;

      // 2. Email verification
      const verifyRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123456',
      });
      if (!verifyRes.ok()) {
        const text = await verifyRes.text();
        throw new Error(`Email verification failed: ${verifyRes.status()} - ${text}`);
      }

      // 3. Login to get token
      const loginRes = await authApi.login({
        email: testUser.email,
        password: testUser.password,
      });
      if (!loginRes.ok()) {
        const text = await loginRes.text();
        throw new Error(`Login failed: ${loginRes.status()} - ${text}`);
      }
      const loginData = await loginRes.json();

      return {
        id: userId,
        email: testUser.email,
        name: testUser.fullName,
        password: testUser.password,
        token: loginData.access_token,
      };
    };

    await use(helper);
    await apiContext.dispose();
  },

  authenticatedUser: async ({ page, createTestUser, playwright }, use) => {
    const user = await createTestUser();

    // Pre-seed token into localStorage for immediate session restoration
    await page.addInitScript((token: string) => {
      window.localStorage.setItem('wrightpay_access_token', token);
    }, user.token);

    const userApiContext = await playwright.request.newContext({
      baseURL: getNormalizedApiBaseUrl(),
      extraHTTPHeaders: {
        Authorization: `Bearer ${user.token}`,
      },
    });

    const dashboardPage = new DashboardPage(page);
    const beneficiariesPage = new BeneficiariesPage(page);
    const cardsPage = new CardsPage(page);
    const sendMoneyPage = new SendMoneyPage(page);
    const transactionsPage = new TransactionsPage(page);

    const beneficiariesApi = new BeneficiariesApi(userApiContext);
    const cardsApi = new CardsApi(userApiContext);
    const transfersApi = new TransfersApi(userApiContext);
    const walletApi = new WalletApi(userApiContext);
    const transactionsApi = new TransactionsApi(userApiContext);
    const exchangeRatesApi = new ExchangeRatesApi(userApiContext);

    await use({
      page,
      user,
      dashboardPage,
      beneficiariesPage,
      cardsPage,
      sendMoneyPage,
      transactionsPage,
      apiContext: userApiContext,
      beneficiariesApi,
      cardsApi,
      transfersApi,
      walletApi,
      transactionsApi,
      exchangeRatesApi,
    });

    await userApiContext.dispose();
  },
});

export { expect };
