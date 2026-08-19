import walletsData from '@/test-data/wallets.json';
import exchangeRatesData from '@/test-data/exchange-rates.json';
import { Currency, ExchangeRate, Wallet, User } from '@/types';

const seedWallets: Wallet[] = (walletsData as Wallet[]) || [];
const exchangeRates: ExchangeRate[] = (exchangeRatesData as ExchangeRate[]) || [];

export const MOCK_WALLETS_STORAGE_KEY = 'wrightpay_mock_wallets';

export const ALL_CURRENCIES: Currency[] = ['EUR', 'GBP', 'USD', 'AED', 'PLN', 'INR'];

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function getStoredWallets(): Wallet[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(MOCK_WALLETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredWallets(wallets: Wallet[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(MOCK_WALLETS_STORAGE_KEY, JSON.stringify(wallets));
  } catch {
    // Fallback
  }
}

/**
 * Calculates conversion rate between any two supported currencies based on exchange-rates.json.
 */
export function getExchangeRate(from: Currency, to: Currency): number {
  if (from === to) return 1.0;

  // 1. Direct match in exchangeRates
  const direct = exchangeRates.find((r) => r.from === from && r.to === to);
  if (direct) return direct.rate;

  // 2. Inverse match (e.g. GBP -> EUR where EUR -> GBP is 0.85)
  const inverse = exchangeRates.find((r) => r.from === to && r.to === from);
  if (inverse && inverse.rate > 0) return 1 / inverse.rate;

  // 3. Convert via EUR base (since EUR has rates to GBP, USD, AED, PLN, INR)
  const eurToFrom = from === 'EUR' ? 1 : exchangeRates.find((r) => r.from === 'EUR' && r.to === from)?.rate;
  const eurToTarget = to === 'EUR' ? 1 : exchangeRates.find((r) => r.from === 'EUR' && r.to === to)?.rate;

  if (eurToFrom && eurToTarget) {
    return eurToTarget / eurToFrom;
  }

  // 4. Fallback via INR
  const fromToInr = exchangeRates.find((r) => r.from === from && r.to === 'INR')?.rate;
  const targetToInr = exchangeRates.find((r) => r.from === to && r.to === 'INR')?.rate;
  if (fromToInr && targetToInr && targetToInr > 0) {
    return fromToInr / targetToInr;
  }

  return 1.0;
}

/**
 * Returns all configured seed wallets.
 */
export function getWallets(): Wallet[] {
  return [...seedWallets];
}

/**
 * Returns the default primary wallet from seed data.
 */
export function getDefaultWallet(): Wallet | undefined {
  return seedWallets.find((w) => w.isDefault) || seedWallets[0];
}

/**
 * Finds a wallet by wallet ID.
 */
export function getWalletById(id: string): Wallet | undefined {
  return seedWallets.find((w) => w.id === id);
}

/**
 * Finds a wallet by its currency code.
 */
export function getWalletByCurrency(currency: Currency): Wallet | undefined {
  return seedWallets.find((w) => w.currency === currency);
}

/**
 * Resolves the primary wallet for a user.
 * 1. Checks runtime localStorage persisted wallets.
 * 2. Fallback to wallets.json seed data matching user.id.
 * 3. Fallback to default 0 balance for newly registered users.
 */
export function getUserWallet(user?: User | null): Wallet {
  const currency: Currency = user?.defaultCurrency || 'EUR';
  if (user?.id) {
    const stored = getStoredWallets();
    const foundStored = stored.find((w) => w.userId === user.id);
    if (foundStored) return foundStored;

    const foundSeed = seedWallets.find((w) => w.userId === user.id);
    if (foundSeed) return foundSeed;
  }
  return {
    id: `wal_${user?.id || 'default'}`,
    userId: user?.id,
    currency,
    balance: 0,
    isDefault: true,
  };
}

/**
 * Updates a user's wallet balance and persists it to localStorage.
 */
export function updateUserWalletBalance(userId: string, newBalance: number): Wallet {
  const currentWallet = getUserWallet({ id: userId, defaultCurrency: 'EUR' } as User);
  const updatedWallet: Wallet = {
    ...currentWallet,
    balance: Number(newBalance.toFixed(2)),
  };

  const stored = getStoredWallets();
  const existingIdx = stored.findIndex((w) => w.userId === userId);
  let newStored: Wallet[];
  if (existingIdx >= 0) {
    newStored = [...stored];
    newStored[existingIdx] = updatedWallet;
  } else {
    newStored = [...stored, updatedWallet];
  }

  saveStoredWallets(newStored);
  return updatedWallet;
}

/**
 * Deducts an amount from the user's primary wallet balance and persists the result in localStorage.
 * Returns the updated wallet, or null if insufficient funds.
 */
export function deductUserWalletBalance(userId: string, amount: number): Wallet | null {
  if (!userId || amount <= 0) return null;

  const currentWallet = getUserWallet({ id: userId, defaultCurrency: 'EUR' } as User);
  if (currentWallet.balance < amount) {
    return null; // Insufficient funds
  }

  const newBalance = currentWallet.balance - amount;
  return updateUserWalletBalance(userId, newBalance);
}

/**
 * Generates conversion equivalents of a single user wallet balance across all supported currencies.
 */
export function getCurrencyEquivalents(baseWallet: Wallet): Wallet[] {
  return ALL_CURRENCIES.map((currency) => {
    if (currency === baseWallet.currency) {
      return {
        id: `equiv_${currency}`,
        userId: baseWallet.userId,
        currency,
        balance: baseWallet.balance,
        isDefault: true,
      };
    }
    const rate = getExchangeRate(baseWallet.currency, currency);
    const convertedBalance = Number((baseWallet.balance * rate).toFixed(2));
    return {
      id: `equiv_${currency}`,
      userId: baseWallet.userId,
      currency,
      balance: convertedBalance,
      isDefault: false,
    };
  });
}
