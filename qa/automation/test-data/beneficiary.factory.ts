import { CreateBeneficiaryRequest } from '../api/types';

let beneficiaryCounter = 0;

export interface TestBeneficiaryData extends CreateBeneficiaryRequest {
  name: string;
}

/**
 * Generate unique, deterministic-yet-isolated bank beneficiary data for automated testing.
 */
export function generateTestBeneficiaryData(
  overrides?: Partial<CreateBeneficiaryRequest>
): CreateBeneficiaryRequest {
  beneficiaryCounter += 1;
  const uniqueId = `${Date.now()}_${process.pid}_${beneficiaryCounter}_${Math.floor(Math.random() * 10000)}`;

  return {
    name: overrides?.name || `Beneficiary_${uniqueId}`,
    currency: overrides?.currency || 'EUR',
    payoutMethod: overrides?.payoutMethod || 'bank_account',
    accountNumber: overrides?.accountNumber || `DE89370400440532${uniqueId.slice(-4)}`,
    bankCode: overrides?.bankCode || 'DEUTDEDD',
    bankName: overrides?.bankName || 'Deutsche Bank',
    ...overrides,
  };
}

/**
 * Generate unique, deterministic-yet-isolated UPI beneficiary data for automated testing.
 */
export function generateTestUpiBeneficiaryData(
  overrides?: Partial<CreateBeneficiaryRequest>
): CreateBeneficiaryRequest {
  beneficiaryCounter += 1;
  const uniqueId = `${Date.now()}_${process.pid}_${beneficiaryCounter}_${Math.floor(Math.random() * 10000)}`;

  return {
    name: overrides?.name || `UPI_Beneficiary_${uniqueId}`,
    currency: 'INR',
    payoutMethod: 'upi',
    upiId: overrides?.upiId || `qa_${uniqueId}@okhdfcbank`,
    bankName: overrides?.bankName || 'UPI',
    ...overrides,
  };
}
