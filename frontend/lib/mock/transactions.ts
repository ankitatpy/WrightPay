import transactionsData from '@/test-data/transactions.json';
import { Currency, MockTransaction, TransactionStatus } from '@/types';

const seedTransactions: MockTransaction[] = (transactionsData as MockTransaction[]) || [];

export const MOCK_TRANSACTIONS_STORAGE_KEY = 'wrightpay_mock_transactions';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function getStoredTransactions(): MockTransaction[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(MOCK_TRANSACTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredTransactions(txs: MockTransaction[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(MOCK_TRANSACTIONS_STORAGE_KEY, JSON.stringify(txs));
  } catch {
    // Fallback
  }
}

/**
 * Returns all mock transactions (stored runtime transactions + seed data).
 */
export function getTransactions(): MockTransaction[] {
  const stored = getStoredTransactions();
  const storedIds = new Set(stored.map((t) => t.id));
  const nonDuplicateSeeds = seedTransactions.filter((t) => !storedIds.has(t.id));
  return [...stored, ...nonDuplicateSeeds];
}

/**
 * Returns transactions belonging to a specific user (newest first).
 */
export function getUserTransactions(userId?: string): MockTransaction[] {
  if (!userId) return [];
  const all = getTransactions();
  return all.filter((tx) => tx.userId === userId);
}

/**
 * Adds a new mock transaction and persists it in localStorage.
 */
export function addMockTransaction(tx: MockTransaction): MockTransaction {
  const stored = getStoredTransactions();
  const updated = [tx, ...stored];
  saveStoredTransactions(updated);
  return tx;
}

export interface CreateTransactionParams {
  userId: string;
  recipient: string;
  amount: number;
  currency: Currency;
  senderAmount: number;
  senderCurrency: Currency;
  recipientAmount: number;
  recipientCurrency: Currency;
  fee: number;
  exchangeRate: number;
}

/**
 * Generates a standard WrightPay transaction reference code (e.g. WP-20260818-456).
 */
export function generateTransactionReference(): string {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dateCompact = dateStr.replace(/-/g, '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `WP-${dateCompact}-${randomSuffix}`;
}

/**
 * Creates and persists a new transaction to the mock store.
 */
export function createAndPersistTransaction(params: CreateTransactionParams): MockTransaction {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const reference = generateTransactionReference();

  const newTx: MockTransaction = {
    id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: params.userId,
    date: dateStr,
    recipient: params.recipient,
    amount: params.amount,
    currency: params.currency,
    senderAmount: params.senderAmount,
    senderCurrency: params.senderCurrency,
    recipientAmount: params.recipientAmount,
    recipientCurrency: params.recipientCurrency,
    fee: params.fee,
    exchangeRate: params.exchangeRate,
    status: 'PENDING',
    reference,
  };

  addMockTransaction(newTx);
  return newTx;
}

/**
 * Finds a transaction by its unique ID.
 */
export function getTransactionById(id: string): MockTransaction | undefined {
  return getTransactions().find((tx) => tx.id === id);
}

/**
 * Finds a transaction by its reference code (e.g. WP-20260816-001).
 */
export function findTransactionByReference(reference: string): MockTransaction | undefined {
  return getTransactions().find(
    (tx) => tx.reference.toLowerCase() === reference.toLowerCase()
  );
}

/**
 * Filters transactions by status (supports PENDING, PROCESSING, COMPLETED, FAILED, SUSPICIOUS).
 */
export function getTransactionsByStatus(status: TransactionStatus): MockTransaction[] {
  return getTransactions().filter(
    (tx) => tx.status.toLowerCase() === status.toLowerCase()
  );
}
