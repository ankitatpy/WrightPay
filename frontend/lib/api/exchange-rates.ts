import { api } from '@/lib/api';
import { Currency, ExchangeRate, ExchangeQuote } from '@/types';

/**
 * Fetch all available exchange rates from the backend.
 * Endpoint: GET /api/v1/exchange-rates (Public)
 */
export async function getExchangeRates(): Promise<ExchangeRate[]> {
  return api.get<ExchangeRate[]>('/exchange-rates');
}

/**
 * Calculate a server-side currency conversion quote.
 * Endpoint: GET /api/v1/exchange-rates/quote?from=EUR&to=INR&amount=100 (Public)
 *
 * NOTE: The backend performs all exchange-rate lookup, inverse/triangular conversions,
 * rounding, and calculations. The frontend never performs FX math locally.
 */
export async function getQuote(
  from: Currency,
  to: Currency,
  amount: number,
): Promise<ExchangeQuote> {
  return api.get<ExchangeQuote>('/exchange-rates/quote', {
    params: {
      from,
      to,
      amount,
    },
  });
}
