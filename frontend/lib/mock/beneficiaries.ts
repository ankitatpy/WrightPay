import beneficiariesData from '@/test-data/beneficiaries.json';
import { Beneficiary } from '@/types';

const beneficiaries: Beneficiary[] = beneficiariesData as Beneficiary[];

export const MAX_BENEFICIARIES = 3;

/**
 * Returns all saved beneficiaries (maximum 3 in V1).
 */
export function getBeneficiaries(): Beneficiary[] {
  return [...beneficiaries];
}

/**
 * Finds a beneficiary by ID.
 */
export function getBeneficiaryById(id: string): Beneficiary | undefined {
  return beneficiaries.find((b) => b.id === id);
}

/**
 * Checks if the user has reached the V1 maximum of 3 beneficiaries.
 */
export function hasReachedMaxBeneficiaries(): boolean {
  return beneficiaries.length >= MAX_BENEFICIARIES;
}
