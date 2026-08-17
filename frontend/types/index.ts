export type Currency = 'EUR' | 'GBP' | 'USD' | 'AED' | 'PLN' | 'INR';

export interface Wallet {
  id: string;
  currency: Currency;
  balance: number;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  recipient: string;
  amount: number;
  currency: Currency;
  fee: number;
  exchangeRate: number;
  status: 'completed' | 'pending' | 'failed';
  reference: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  currency: Currency;
  accountNumber: string;
  bankCode: string;
}

export interface Card {
  id: string;
  lastFourDigits: string;
  cardholderName: string;
  expiryDate: string;
  status: 'active' | 'declined' | 'pending';
  type: 'debit' | 'credit';
}

export interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  defaultCurrency: Currency;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'not_started';
}
