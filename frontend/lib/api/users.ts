import { api } from '@/lib/api';
import { User, Currency } from '@/types';

export interface UpdateUserPayload {
  name?: string;
  countryOfResidence?: string;
  defaultCurrency?: Currency;
}

/**
 * Get current user profile.
 * Endpoint: GET /api/v1/users/me (Authenticated)
 */
export async function getMe(): Promise<User> {
  return api.get<User>('/users/me');
}

/**
 * Update current user profile.
 * Endpoint: PATCH /api/v1/users/me (Authenticated)
 */
export async function updateMe(payload: UpdateUserPayload): Promise<User> {
  return api.patch<User>('/users/me', payload);
}
