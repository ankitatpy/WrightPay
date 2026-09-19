import { SignupRequest } from '../api/types';

export interface TestUserData extends SignupRequest {
  fullName: string;
}

let userCounter = 0;

/**
 * Generate unique, deterministic-yet-isolated user signup data for automated testing.
 */
export function generateTestUserData(overrides?: Partial<SignupRequest>): TestUserData {
  userCounter += 1;
  const uniqueId = `${Date.now()}_${process.pid}_${userCounter}_${Math.floor(Math.random() * 10000)}`;
  const firstName = overrides?.firstName || `QAUser${userCounter}`;
  const lastName = overrides?.lastName || `Test`;
  const email = overrides?.email || `qa_${uniqueId}@wrightpay-qa.test`.toLowerCase();
  const password = overrides?.password || 'TestPassword123!';
  const agreeTerms = overrides?.agreeTerms !== undefined ? overrides.agreeTerms : true;

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email,
    password,
    agreeTerms,
  };
}
