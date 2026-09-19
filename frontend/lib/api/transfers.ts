import { api } from '@/lib/api';
import { Currency, Transaction, TransactionStatus } from '@/types';

export interface CreateTransferPayload {
  beneficiaryId: string;
  sourceWalletId: string;
  sendAmount: number;
  destinationCurrency: Currency;
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
 * Initiate an atomic wallet-to-beneficiary transfer with Redis idempotency.
 * Endpoint: POST /api/v1/transfers (Authenticated)
 * Header: Idempotency-Key (Required)
 */
export async function createTransfer(
  payload: CreateTransferPayload,
  idempotencyKey: string,
): Promise<Transaction> {
  const data = await api.post<RawBackendTransaction>('/transfers', payload, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });
  return normalizeTransaction(data);
}
