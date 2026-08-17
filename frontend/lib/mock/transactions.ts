import transactionsData from '@/test-data/transactions.json';
import { MockTransaction, TransactionStatus } from '@/types';

const transactions: MockTransaction[] = transactionsData as MockTransaction[];

/**
 * Returns all mock transactions.
 */
export function getTransactions(): MockTransaction[] {
  return [...transactions];
}

/**
 * Finds a transaction by its unique ID.
 */
export function getTransactionById(id: string): MockTransaction | undefined {
  return transactions.find((tx) => tx.id === id);
}

/**
 * Finds a transaction by its reference code (e.g. WP-20260816-001).
 */
export function findTransactionByReference(reference: string): MockTransaction | undefined {
  return transactions.find(
    (tx) => tx.reference.toLowerCase() === reference.toLowerCase()
  );
}

/**
 * Filters transactions by status (supports PENDING, PROCESSING, COMPLETED, FAILED, SUSPICIOUS).
 */
export function getTransactionsByStatus(status: TransactionStatus): MockTransaction[] {
  return transactions.filter(
    (tx) => tx.status.toLowerCase() === status.toLowerCase()
  );
}
