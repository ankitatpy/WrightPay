import { dbClient } from '../database/db-client';
import { CreateBeneficiaryRequest, CreateTransferRequest } from '../api/types';
import { generateTestBeneficiaryData } from './beneficiary.factory';

export interface FundedUserSetupResult {
  wallet: {
    id: string;
    userId: string;
    currency: string;
    balance: number;
  };
  beneficiary: {
    id: string;
    userId: string;
    name: string;
    currency: string;
    accountNumber: string;
    payoutMethod: string;
  };
}

/**
 * Setup helper: ensures authenticated user's wallet has a deterministic funded balance
 * and creates a dedicated test beneficiary.
 */
export async function setupFundedUser(
  userContext: {
    walletApi: { getMyWallet: () => Promise<any> };
    beneficiariesApi: { createBeneficiary: (data: CreateBeneficiaryRequest) => Promise<any> };
  },
  balance: number = 500,
  beneficiaryOverrides?: Partial<CreateBeneficiaryRequest>,
): Promise<FundedUserSetupResult> {
  const walletRes = await userContext.walletApi.getMyWallet();
  if (!walletRes.ok()) {
    throw new Error(`Failed to fetch wallet: ${walletRes.status()}`);
  }
  const wallet = await walletRes.json();

  // Set authoritative test balance in PostgreSQL directly
  await dbClient.query('UPDATE wallets SET balance = $1 WHERE id = $2', [balance, wallet.id]);
  wallet.balance = balance;

  // Create isolated beneficiary
  const benPayload = generateTestBeneficiaryData(beneficiaryOverrides);
  const benRes = await userContext.beneficiariesApi.createBeneficiary(benPayload);
  if (!benRes.ok()) {
    throw new Error(`Failed to create beneficiary: ${benRes.status()}`);
  }
  const beneficiary = await benRes.json();

  return { wallet, beneficiary };
}

/**
 * Generate unique idempotency key for transfers
 */
export function generateIdempotencyKey(prefix = 'wp-ui'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
