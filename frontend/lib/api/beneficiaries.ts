import { api } from '@/lib/api';
import { Beneficiary, BeneficiaryPayoutMethod, Currency } from '@/types';

export interface CreateBeneficiaryPayload {
  name: string;
  currency: Currency;
  payoutMethod?: BeneficiaryPayoutMethod;
  accountNumber?: string;
  bankCode?: string;
  ifscCode?: string;
  upiId?: string;
  bankName?: string;
}

/**
 * Get all active beneficiaries for the authenticated user.
 * Endpoint: GET /api/v1/beneficiaries (Authenticated)
 */
export async function getBeneficiaries(): Promise<Beneficiary[]> {
  return api.get<Beneficiary[]>('/beneficiaries');
}

/**
 * Create a new beneficiary (max 3 active per user).
 * Endpoint: POST /api/v1/beneficiaries (Authenticated)
 */
export async function createBeneficiary(
  payload: CreateBeneficiaryPayload,
): Promise<Beneficiary> {
  return api.post<Beneficiary>('/beneficiaries', payload);
}

/**
 * Delete a beneficiary.
 * Endpoint: DELETE /api/v1/beneficiaries/:id (Authenticated)
 */
export async function deleteBeneficiary(id: string): Promise<void> {
  return api.delete<void>(`/beneficiaries/${id}`);
}
