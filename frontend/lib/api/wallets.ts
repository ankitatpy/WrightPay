import { api } from '@/lib/api';
import { Currency, Wallet, WalletResponse } from '@/types';

export const ALL_CURRENCIES: Currency[] = ['EUR', 'GBP', 'USD', 'AED', 'PLN', 'INR'];

/**
 * Fetch authenticated user's primary wallet along with server-calculated currency equivalents.
 * Endpoint: GET /api/v1/wallets/me
 */
export async function getMyWallet(): Promise<WalletResponse> {
  return api.get<WalletResponse>('/wallets/me');
}

/**
 * Presentation Adapter:
 * Converts backend WalletResponse into presentation-friendly Wallet[] array
 * for consumption by the existing WalletCard component.
 *
 * NOTE: Does NOT perform any client-side FX calculations; it relies strictly on
 * the authoritative `equivalents` returned by the backend.
 */
export function transformWalletEquivalents(walletResponse: WalletResponse): Wallet[] {
  return ALL_CURRENCIES.map((currency) => {
    const isBase = currency === walletResponse.currency;
    const balance =
      walletResponse.equivalents && typeof walletResponse.equivalents[currency] === 'number'
        ? walletResponse.equivalents[currency]
        : isBase
          ? walletResponse.balance
          : 0;

    return {
      id: isBase ? walletResponse.id : `equiv_${currency}`,
      currency,
      balance,
      isDefault: isBase,
    };
  });
}
