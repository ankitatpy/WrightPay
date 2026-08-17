import walletsData from '@/test-data/wallets.json';
import { Currency, Wallet } from '@/types';

const wallets: Wallet[] = walletsData as Wallet[];

/**
 * Returns all configured wallets.
 */
export function getWallets(): Wallet[] {
  return [...wallets];
}

/**
 * Returns the default wallet (EUR).
 */
export function getDefaultWallet(): Wallet | undefined {
  return wallets.find((w) => w.isDefault);
}

/**
 * Finds a wallet by wallet ID.
 */
export function getWalletById(id: string): Wallet | undefined {
  return wallets.find((w) => w.id === id);
}

/**
 * Finds a wallet by its currency code.
 */
export function getWalletByCurrency(currency: Currency): Wallet | undefined {
  return wallets.find((w) => w.currency === currency);
}
