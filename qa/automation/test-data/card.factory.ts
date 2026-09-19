import { CreateCardRequest } from '../api/types';

let cardCounter = 0;

export interface TestCardData extends CreateCardRequest {
  rawCardNumber: string;
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
}

export type CardOverrides = Partial<CreateCardRequest> & {
  expiryMonth?: string;
  expiryYear?: string;
};

/**
 * Generate unique, deterministic test card data.
 * Adheres to security rules: CVV and PAN are test-synthetic and safe.
 */
export function generateTestCardData(overrides?: CardOverrides): TestCardData {
  cardCounter += 1;
  const counterStr = String(cardCounter).padStart(4, '0');
  const lastFour = counterStr.slice(-4);
  const rawCardNumber = overrides?.cardNumber || `424242424242${lastFour}`;
  const expiryMonth = overrides?.expiryMonth || '12';
  const expiryYear = overrides?.expiryYear || '28';
  const expiryDate = overrides?.expiryDate || `${expiryMonth}/${expiryYear}`;

  return {
    cardholderName: overrides?.cardholderName || `Test Holder ${cardCounter}`,
    type: overrides?.type || 'debit',
    cardNumber: rawCardNumber,
    rawCardNumber,
    lastFourDigits: lastFour,
    expiryDate,
    expiryMonth,
    expiryYear,
    cvv: overrides?.cvv || '123',
    ...overrides,
  };
}
