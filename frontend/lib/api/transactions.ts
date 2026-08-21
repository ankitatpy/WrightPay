import { api } from '@/lib/api';
import { Currency, Transaction, TransactionStatus } from '@/types';

export interface GetTransactionsParams {
  status?: TransactionStatus;
  reference?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

interface RawBackendTransaction {
  id: string;
  userId: string;
  reference: string;
  date: string;
  recipient: string;
  amount: number | string;
  currency: Currency;
  senderAmount?: number | string;
  senderCurrency?: Currency;
  recipientAmount?: number | string;
  recipientCurrency?: Currency;
  fee: number | string;
  exchangeRate: number | string;
  status: TransactionStatus;
  failureReason?: string;
  createdAt: string;
}


function normalizeTransaction(raw: RawBackendTransaction): Transaction {
  return {
    id: raw.id,
    userId: raw.userId,
    reference: raw.reference,
    date: raw.date || raw.createdAt,
    recipient: raw.recipient,
    amount: Number(raw.amount || 0),
    currency: raw.currency,
    senderAmount: raw.senderAmount ? Number(raw.senderAmount) : undefined,
    senderCurrency: raw.senderCurrency || undefined,
    recipientAmount: raw.recipientAmount ? Number(raw.recipientAmount) : undefined,
    recipientCurrency: raw.recipientCurrency || undefined,
    fee: Number(raw.fee || 0),
    exchangeRate: Number(raw.exchangeRate || 1),
    status: raw.status,
    failureReason: raw.failureReason || undefined,
  };
}

/**
 * Get paginated and filtered transactions for authenticated user.
 * Endpoint: GET /api/v1/transactions (Authenticated)
 */
export async function getTransactions(
  params?: GetTransactionsParams,
): Promise<PaginatedTransactions> {
  const data = await api.get<{
    items: RawBackendTransaction[];
    total: number;
    limit: number;
    offset: number;
  }>('/transactions', {
    params: params as Record<string, string | number | boolean | undefined>,
  });

  return {
    items: Array.isArray(data?.items) ? data.items.map(normalizeTransaction) : [],
    total: data?.total ?? 0,
    limit: data?.limit ?? 20,
    offset: data?.offset ?? 0,
  };
}

/**
 * Get a single transaction by ID.
 * Endpoint: GET /api/v1/transactions/:id (Authenticated)
 */
export async function getTransaction(id: string): Promise<Transaction> {
  const data = await api.get<RawBackendTransaction>(`/transactions/${id}`);
  return normalizeTransaction(data);
}
