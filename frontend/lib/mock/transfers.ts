import exchangeRatesData from '@/test-data/exchange-rates.json';
import { Currency, ExchangeRate, TransferDraft } from '@/types';

const exchangeRates: ExchangeRate[] = exchangeRatesData as ExchangeRate[];

/**
 * Fixed WrightPay fee in EUR added on top of sender funding amount.
 */
export const WRIGHT_PAY_FIXED_FEE = 25;

/**
 * Returns all simulated exchange rates.
 */
export function getExchangeRates(): ExchangeRate[] {
  return [...exchangeRates];
}

/**
 * Finds the exchange rate between two currencies.
 */
export function getExchangeRate(from: Currency, to: Currency): ExchangeRate | undefined {
  if (from === to) {
    return {
      from,
      to,
      rate: 1.0,
      timestamp: new Date().toISOString(),
    };
  }
  return exchangeRates.find((rate) => rate.from === from && rate.to === to);
}

export interface CalculateTransferParams {
  sendAmount: number;
  sourceCurrency: Currency;
  destinationCurrency: Currency;
}

export interface TransferCalculationResult {
  sendAmount: number;
  sourceCurrency: Currency;
  destinationCurrency: Currency;
  exchangeRate: number;
  fee: number;
  recipientAmount: number;
  totalDebitAmount: number;
}

/**
 * Calculates transfer amounts and fees based on WrightPay V1 domain rules:
 * - €25 fixed WrightPay fee added on top of sender funding amount
 * - Recipient amount = sendAmount * exchangeRate
 * - Total debit amount = sendAmount + fee
 */
export function calculateTransferDetails({
  sendAmount,
  sourceCurrency,
  destinationCurrency,
}: CalculateTransferParams): TransferCalculationResult {
  const rateObj = getExchangeRate(sourceCurrency, destinationCurrency);
  const rate = rateObj ? rateObj.rate : 1.0;
  const fee = WRIGHT_PAY_FIXED_FEE;
  const recipientAmount = Number((sendAmount * rate).toFixed(2));
  const totalDebitAmount = Number((sendAmount + fee).toFixed(2));

  return {
    sendAmount,
    sourceCurrency,
    destinationCurrency,
    exchangeRate: rate,
    fee,
    recipientAmount,
    totalDebitAmount,
  };
}

/**
 * Creates a mock transfer draft for review (foundation for future transfer workflow).
 * Does not execute money movement or transfer state transitions.
 */
export function createMockTransferDraft(params: {
  sourceWalletId: string;
  beneficiaryId: string;
  sendAmount: number;
  sourceCurrency: Currency;
  destinationCurrency: Currency;
}): TransferDraft {
  const calculation = calculateTransferDetails({
    sendAmount: params.sendAmount,
    sourceCurrency: params.sourceCurrency,
    destinationCurrency: params.destinationCurrency,
  });

  return {
    sourceWalletId: params.sourceWalletId,
    beneficiaryId: params.beneficiaryId,
    sendAmount: calculation.sendAmount,
    sendCurrency: calculation.sourceCurrency,
    receiveAmount: calculation.recipientAmount,
    receiveCurrency: calculation.destinationCurrency,
    exchangeRate: calculation.exchangeRate,
    fee: calculation.fee,
    totalDebitAmount: calculation.totalDebitAmount,
  };
}
