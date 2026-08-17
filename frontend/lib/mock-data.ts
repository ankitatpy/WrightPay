import { Wallet, Transaction, Card, Beneficiary, ExchangeRate, User } from '@/types';

export const mockUser: User = {
  id: '1',
  name: 'Anna Kowalski',
  email: 'anna@example.com',
  defaultCurrency: 'EUR',
  kycStatus: 'approved',
};

export const mockWallets: Wallet[] = [
  {
    id: '1',
    currency: 'EUR',
    balance: 5420.50,
    isDefault: true,
  },
  {
    id: '2',
    currency: 'GBP',
    balance: 1230.00,
    isDefault: false,
  },
  {
    id: '3',
    currency: 'USD',
    balance: 3450.75,
    isDefault: false,
  },
  {
    id: '4',
    currency: 'AED',
    balance: 8765.25,
    isDefault: false,
  },
  {
    id: '5',
    currency: 'PLN',
    balance: 12500.00,
    isDefault: false,
  },
  {
    id: '6',
    currency: 'INR',
    balance: 75000.00,
    isDefault: false,
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: '2024-08-15',
    recipient: 'Marie Dubois',
    amount: 250.00,
    currency: 'EUR',
    fee: 2.50,
    exchangeRate: 1.0,
    status: 'completed',
    reference: 'WP-20240815-001',
  },
  {
    id: '2',
    date: '2024-08-14',
    recipient: 'James Smith',
    amount: 500.00,
    currency: 'GBP',
    fee: 5.00,
    exchangeRate: 1.17,
    status: 'completed',
    reference: 'WP-20240814-002',
  },
  {
    id: '3',
    date: '2024-08-13',
    recipient: 'Carlos Rodriguez',
    amount: 1000.00,
    currency: 'EUR',
    fee: 10.00,
    exchangeRate: 1.0,
    status: 'pending',
    reference: 'WP-20240813-003',
  },
  {
    id: '4',
    date: '2024-08-12',
    recipient: 'Priya Patel',
    amount: 300.00,
    currency: 'USD',
    fee: 3.00,
    exchangeRate: 0.92,
    status: 'completed',
    reference: 'WP-20240812-004',
  },
  {
    id: '5',
    date: '2024-08-11',
    recipient: 'Ahmed Hassan',
    amount: 2000.00,
    currency: 'AED',
    fee: 20.00,
    exchangeRate: 0.27,
    status: 'completed',
    reference: 'WP-20240811-005',
  },
];

export const mockCards: Card[] = [
  {
    id: '1',
    lastFourDigits: '4242',
    cardholderName: 'Anna Kowalski',
    expiryDate: '08/26',
    status: 'active',
    type: 'debit',
  },
  {
    id: '2',
    lastFourDigits: '8765',
    cardholderName: 'Anna Kowalski',
    expiryDate: '03/25',
    status: 'declined',
    type: 'credit',
  },
];

export const mockBeneficiaries: Beneficiary[] = [
  {
    id: '1',
    name: 'Marie Dubois',
    currency: 'EUR',
    accountNumber: 'FR1420041010050500013M02606',
    bankCode: 'BNPAFRPP',
  },
  {
    id: '2',
    name: 'James Smith',
    currency: 'GBP',
    accountNumber: 'GB82WEST12345698765432',
    bankCode: 'WESTGB2L',
  },
];

export const mockExchangeRates: ExchangeRate[] = [
  { from: 'EUR', to: 'GBP', rate: 0.85, timestamp: '2024-08-17T10:30:00Z' },
  { from: 'EUR', to: 'USD', rate: 1.09, timestamp: '2024-08-17T10:30:00Z' },
  { from: 'EUR', to: 'AED', rate: 4.00, timestamp: '2024-08-17T10:30:00Z' },
  { from: 'EUR', to: 'PLN', rate: 4.35, timestamp: '2024-08-17T10:30:00Z' },
  { from: 'EUR', to: 'INR', rate: 90.50, timestamp: '2024-08-17T10:30:00Z' },
];

export const WRIGHT_PAY_FEE = 25; // EUR
export const MAX_BENEFICIARIES = 3;
