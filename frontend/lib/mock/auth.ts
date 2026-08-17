import usersData from '@/test-data/users.json';
import verificationData from '@/test-data/verification.json';
import { User, VerificationRecord } from '@/types';

const users: User[] = usersData as User[];
const verifications: VerificationRecord[] = verificationData as VerificationRecord[];

export interface MockSignupParams {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
}

export interface MockSignupResult {
  success: boolean;
  user?: User;
  message?: string;
}

/**
 * Simulates mock account creation for frontend development.
 */
export function mockSignup(params: MockSignupParams): MockSignupResult {
  const existing = findMockUserByEmail(params.email);
  if (existing) {
    return {
      success: true,
      user: existing,
    };
  }

  const newUser: User = {
    id: `usr_${Date.now()}`,
    name: `${params.firstName} ${params.lastName}`.trim(),
    email: params.email.trim(),
    accountType: 'individual',
    countryOfResidence: 'Germany',
    kycStatus: 'not_started',
    accountStatus: 'pending',
    defaultCurrency: 'EUR',
  };

  return {
    success: true,
    user: newUser,
  };
}

/**
 * Returns all mock users in the test dataset.
 */
export function getAllMockUsers(): User[] {
  return [...users];
}

/**
 * Returns the primary default mock user.
 */
export function getCurrentMockUser(): User {
  return users[0];
}

/**
 * Finds a mock user by email address (case-insensitive).
 */
export function findMockUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

/**
 * Finds a mock user by user ID.
 */
export function findMockUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

/**
 * Validates mock credentials for local frontend-only testing.
 */
export function validateMockCredentials(email: string, _password?: string): boolean {
  return users.some((u) => u.email.toLowerCase() === email.toLowerCase());
}

/**
 * Retrieves the verification record for an email.
 */
export function getMockVerification(email: string): VerificationRecord | undefined {
  return verifications.find((v) => v.email.toLowerCase() === email.toLowerCase());
}

/**
 * Verifies a mock code against the verification test dataset.
 * Accepts the standard development test code '123456' for any email.
 */
export function verifyMockCode(email: string, code: string): boolean {
  const cleanCode = code.trim();
  if (!cleanCode) {
    return false;
  }

  const record = getMockVerification(email);
  if (record && record.verificationCode === cleanCode) {
    return true;
  }
  // Standard fallback verification code for mock testing
  return cleanCode === '123456';
}
