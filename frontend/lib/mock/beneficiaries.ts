import beneficiariesData from '@/test-data/beneficiaries.json';
import { Beneficiary, BeneficiaryPayoutMethod, Currency } from '@/types';

const seedBeneficiaries: Beneficiary[] = (beneficiariesData as Beneficiary[]) || [];

export const MAX_BENEFICIARIES = 3;
export const MOCK_BENEFICIARIES_STORAGE_KEY = 'wrightpay_mock_beneficiaries';
export const MOCK_DELETED_BENEFICIARIES_STORAGE_KEY = 'wrightpay_mock_deleted_beneficiaries';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function getStoredBeneficiaries(): Beneficiary[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(MOCK_BENEFICIARIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredBeneficiaries(beneficiaries: Beneficiary[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(MOCK_BENEFICIARIES_STORAGE_KEY, JSON.stringify(beneficiaries));
  } catch {
    // Fallback
  }
}

function getDeletedBeneficiaryIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(MOCK_DELETED_BENEFICIARIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDeletedBeneficiaryIds(ids: string[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(MOCK_DELETED_BENEFICIARIES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Fallback
  }
}

/**
 * Returns all saved beneficiaries (runtime created + active seed data).
 */
export function getBeneficiaries(): Beneficiary[] {
  const stored = getStoredBeneficiaries();
  const deletedIds = new Set(getDeletedBeneficiaryIds());
  const storedIds = new Set(stored.map((b) => b.id));
  const activeSeeds = seedBeneficiaries.filter(
    (b) => !storedIds.has(b.id) && !deletedIds.has(b.id)
  );
  return [...stored, ...activeSeeds];
}

/**
 * Returns beneficiaries belonging to a specific user.
 */
export function getUserBeneficiaries(userId?: string): Beneficiary[] {
  if (!userId) return [];
  const all = getBeneficiaries();
  return all.filter((b) => b.userId === userId);
}

/**
 * Finds a beneficiary by ID.
 */
export function getBeneficiaryById(id: string): Beneficiary | undefined {
  return getBeneficiaries().find((b) => b.id === id);
}

/**
 * Checks if the user has reached the V1 maximum of 3 beneficiaries per user.
 */
export function hasReachedMaxBeneficiaries(userId?: string): boolean {
  if (userId) {
    return getUserBeneficiaries(userId).length >= MAX_BENEFICIARIES;
  }
  return getBeneficiaries().length >= MAX_BENEFICIARIES;
}

export interface AddBeneficiaryParams {
  userId: string;
  name: string;
  currency: Currency;
  payoutMethod?: BeneficiaryPayoutMethod;
  accountNumber: string;
  bankCode?: string;
  ifscCode?: string;
  upiId?: string;
  bankName?: string;
}

/**
 * Adds and persists a new beneficiary for the specified user.
 */
export function addMockBeneficiary(params: AddBeneficiaryParams): Beneficiary | null {
  if (!params.userId || hasReachedMaxBeneficiaries(params.userId)) {
    return null;
  }

  const newBeneficiary: Beneficiary = {
    id: `ben_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
    userId: params.userId,
    name: params.name.trim(),
    currency: params.currency,
    payoutMethod: params.payoutMethod || 'bank_account',
    accountNumber: params.accountNumber.trim(),
    bankCode: (params.bankCode || params.ifscCode || 'DIRECT').trim(),
    ifscCode: params.ifscCode?.trim(),
    upiId: params.upiId?.trim(),
    bankName: params.bankName?.trim() || 'Bank Account',
  };

  const stored = getStoredBeneficiaries();
  const updated = [newBeneficiary, ...stored];
  saveStoredBeneficiaries(updated);
  return newBeneficiary;
}

/**
 * Removes a beneficiary belonging to the specified user.
 */
export function removeMockBeneficiary(userId: string, beneficiaryId: string): boolean {
  if (!userId || !beneficiaryId) return false;

  // 1. Remove from runtime stored beneficiaries
  const stored = getStoredBeneficiaries();
  const filteredStored = stored.filter(
    (b) => !(b.id === beneficiaryId && b.userId === userId)
  );
  saveStoredBeneficiaries(filteredStored);

  // 2. Track in deleted IDs in case it's a seed beneficiary
  const deletedIds = getDeletedBeneficiaryIds();
  if (!deletedIds.includes(beneficiaryId)) {
    saveDeletedBeneficiaryIds([...deletedIds, beneficiaryId]);
  }

  return true;
}
