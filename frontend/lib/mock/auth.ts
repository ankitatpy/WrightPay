/**
 * ============================================================================
 * PREDEFINED TEST ACCOUNTS (Seed Data for Local Testing)
 * ============================================================================
 * 1. Individual Account (Active, KYC Approved):
 *    Email: anna.kowalski@example.com
 *    Password: Password123!
 *
 * 2. Business Account (Active, KYC Approved):
 *    Email: finance@acmeglobal.co.uk
 *    Password: BusinessPass123!
 *
 * 3. Suspended Account (Suspended, KYC Pending):
 *    Email: tariq.mansoor@example.ae
 *    Password: TariqPass123!
 * ============================================================================
 */

import usersData from '@/test-data/users.json';
import verificationData from '@/test-data/verification.json';
import { User, VerificationRecord } from '@/types';

// Seed data from JSON files
const seedUsers: User[] = (usersData as User[]) || [];
const verifications: VerificationRecord[] = (verificationData as VerificationRecord[]) || [];

/**
 * Storage keys for frontend mock persistence.
 * NOTE: localStorage persistence is temporary for frontend simulation and will
 * later be replaced by the NestJS backend + PostgreSQL + Redis architecture.
 */
export const MOCK_USERS_STORAGE_KEY = 'wrightpay_mock_users';
export const MOCK_SESSION_STORAGE_KEY = 'wrightpay_mock_session';

export interface MockSession {
  userId: string;
  email: string;
  loginAt: string;
}

export interface MockSignupParams {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
}

export interface MockSignupResult {
  success: boolean;
  user?: User;
  message?: string;
}

export interface MockLoginResult {
  success: boolean;
  user?: User;
  error?: 'UNKNOWN_EMAIL' | 'INCORRECT_PASSWORD' | 'ACCOUNT_SUSPENDED' | 'ACCOUNT_INACTIVE' | 'INVALID_INPUT';
  message: string;
}

/**
 * Helper to safely check if code is executing in a browser environment.
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Retrieves persisted users created at runtime in localStorage.
 */
function getPersistedUsers(): User[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(MOCK_USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((u) => u && typeof u === 'object' && typeof u.email === 'string');
    }
    return [];
  } catch (err) {
    console.error('Failed to read persisted mock users from localStorage', err);
    return [];
  }
}

/**
 * Saves runtime users to localStorage.
 */
function savePersistedUsers(users: User[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save mock users to localStorage', err);
  }
}

/**
 * Upserts a user in the persisted localStorage store.
 */
export function upsertPersistedUser(user: User): void {
  if (!user || !user.email) return;
  const persisted = getPersistedUsers();
  const cleanEmail = user.email.trim().toLowerCase();
  const index = persisted.findIndex(
    (u) =>
      (u && u.id && u.id === user.id) ||
      (u && typeof u.email === 'string' && u.email.trim().toLowerCase() === cleanEmail)
  );
  if (index >= 0) {
    persisted[index] = user;
  } else {
    persisted.push(user);
  }
  savePersistedUsers(persisted);
}

/**
 * Returns all mock users combined: seed users from users.json + runtime persisted users from localStorage.
 * Persisted user modifications take precedence over seed data.
 */
export function getAllMockUsers(): User[] {
  const persisted = getPersistedUsers();
  const userMap = new Map<string, User>();

  for (const u of seedUsers) {
    if (u && typeof u.email === 'string') {
      userMap.set(u.email.trim().toLowerCase(), u);
    }
  }

  for (const u of persisted) {
    if (u && typeof u.email === 'string') {
      userMap.set(u.email.trim().toLowerCase(), u);
    }
  }

  return Array.from(userMap.values());
}

/**
 * Finds a mock user by email address (case-insensitive) across seed and persisted users.
 */
export function findMockUserByEmail(email?: string): User | undefined {
  if (!email || typeof email !== 'string') return undefined;
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return undefined;
  return getAllMockUsers().find(
    (u) => u && typeof u.email === 'string' && u.email.trim().toLowerCase() === cleanEmail
  );
}

/**
 * Finds a mock user by user ID across seed and persisted users.
 */
export function findMockUserById(id?: string): User | undefined {
  if (!id || typeof id !== 'string') return undefined;
  return getAllMockUsers().find((u) => u && u.id === id);
}

/**
 * Simulates mock account creation with frontend persistence in localStorage.
 */
export function mockSignup(params: MockSignupParams): MockSignupResult {
  const cleanEmail = (params?.email || '').trim().toLowerCase();
  const cleanFirstName = (params?.firstName || '').trim();
  const cleanLastName = (params?.lastName || '').trim();
  const password = params?.password || '';

  if (!cleanFirstName || !cleanLastName) {
    return {
      success: false,
      message: 'First and last name are required.',
    };
  }

  if (!cleanEmail) {
    return {
      success: false,
      message: 'Email address is required.',
    };
  }

  if (!password) {
    return {
      success: false,
      message: 'Password is required.',
    };
  }

  const existing = findMockUserByEmail(cleanEmail);
  if (existing) {
    return {
      success: false,
      message: 'An account with this email address already exists.',
    };
  }

  const newUser: User = {
    id: `usr_${Date.now()}`,
    name: `${cleanFirstName} ${cleanLastName}`,
    email: cleanEmail,
    mockPassword: password,
    accountType: 'individual',
    countryOfResidence: 'Germany',
    kycStatus: 'not_started',
    accountStatus: 'pending',
    defaultCurrency: 'EUR',
  };

  upsertPersistedUser(newUser);

  return {
    success: true,
    user: newUser,
    message: 'Account created successfully. Please verify your email.',
  };
}

/**
 * Validates mock credentials and creates a temporary mock session upon success.
 */
export function mockLogin(email?: string, password?: string): MockLoginResult {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = password || '';

  if (!cleanEmail) {
    return {
      success: false,
      error: 'INVALID_INPUT',
      message: 'Please enter your email address.',
    };
  }

  if (!cleanPassword) {
    return {
      success: false,
      error: 'INVALID_INPUT',
      message: 'Please enter your password.',
    };
  }

  const user = findMockUserByEmail(cleanEmail);
  if (!user) {
    return {
      success: false,
      error: 'UNKNOWN_EMAIL',
      message: 'No account found with this email address.',
    };
  }

  if (user.mockPassword && user.mockPassword !== cleanPassword) {
    return {
      success: false,
      error: 'INCORRECT_PASSWORD',
      message: 'Incorrect password. Please try again.',
    };
  }

  if (user.accountStatus === 'suspended') {
    return {
      success: false,
      error: 'ACCOUNT_SUSPENDED',
      message: 'Your account has been suspended. Please contact support.',
    };
  }

  if (user.accountStatus === 'closed') {
    return {
      success: false,
      error: 'ACCOUNT_INACTIVE',
      message: 'This account has been closed. Please contact support.',
    };
  }

  // Create temporary mock session
  createMockSession(user);

  return {
    success: true,
    user,
    message: 'Login successful.',
  };
}

/**
 * Backward compatibility wrapper for credential validation.
 */
export function validateMockCredentials(email?: string, password?: string): boolean {
  const result = mockLogin(email, password);
  return result.success;
}

/**
 * Creates a mock session in localStorage.
 * NOTE: This is a temporary frontend simulation. Backend session/JWT handling will replace this.
 */
export function createMockSession(user: User): MockSession {
  const session: MockSession = {
    userId: user.id,
    email: user.email,
    loginAt: new Date().toISOString(),
  };

  if (isBrowser()) {
    try {
      localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (err) {
      console.error('Failed to create mock session in localStorage', err);
    }
  }

  return session;
}

/**
 * Retrieves the current mock session from localStorage.
 */
export function getMockSession(): MockSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(MOCK_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.userId && parsed.email) {
      return parsed as MockSession;
    }
    return null;
  } catch (err) {
    console.error('Failed to read mock session from localStorage', err);
    return null;
  }
}

/**
 * Clears the mock session from localStorage (Logout).
 */
export function mockLogout(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to remove mock session from localStorage', err);
  }
}

/**
 * Determines whether a user is currently authenticated with a valid mock session.
 */
export function isAuthenticated(): boolean {
  const session = getMockSession();
  if (!session || !session.email) return false;
  const user = findMockUserByEmail(session.email);
  return !!user && user.accountStatus !== 'suspended' && user.accountStatus !== 'closed';
}

/**
 * Returns the currently authenticated mock user if a session exists,
 * or the default primary seed mock user.
 */
export function getCurrentMockUser(): User {
  const session = getMockSession();
  if (session && session.email) {
    const user = findMockUserByEmail(session.email);
    if (user) return user;
  }
  const all = getAllMockUsers();
  return all[0] || seedUsers[0];
}

/**
 * Returns the authenticated user or null if unauthenticated.
 */
export function getAuthenticatedUser(): User | null {
  const session = getMockSession();
  if (!session || !session.email) return null;
  return findMockUserByEmail(session.email) || null;
}

/**
 * Retrieves the verification record for an email.
 */
export function getMockVerification(email?: string): VerificationRecord | undefined {
  if (!email || typeof email !== 'string') return undefined;
  const cleanEmail = email.trim().toLowerCase();
  return verifications.find(
    (v) => v && typeof v.email === 'string' && v.email.trim().toLowerCase() === cleanEmail
  );
}

/**
 * Verifies a mock code against the verification test dataset or test fallback (123456).
 * On successful verification, updates the registered user's account status to active.
 */
export function verifyMockCode(email?: string, code?: string): boolean {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').trim();
  if (!cleanCode) {
    return false;
  }

  const record = getMockVerification(cleanEmail);
  const isValid = (record && record.verificationCode === cleanCode) || cleanCode === '123456';

  if (isValid && cleanEmail) {
    const user = findMockUserByEmail(cleanEmail);
    if (user) {
      const updatedUser: User = {
        ...user,
        accountStatus: 'active',
      };
      upsertPersistedUser(updatedUser);

      // If active session belongs to this user, refresh session
      const session = getMockSession();
      if (session && session.email && session.email.trim().toLowerCase() === cleanEmail) {
        createMockSession(updatedUser);
      }
    }
  }

  return isValid;
}


