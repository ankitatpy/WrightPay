import { api } from '@/lib/api';
import { Card, CardStatus } from '@/types';

export interface CreateCardPayload {
  cardholderName: string;
  type?: 'debit' | 'credit';
  cardNumber?: string;
  lastFourDigits?: string;
  expiryDate: string;
  cvv?: string;
}

interface BackendCard {
  id: string;
  userId: string;
  lastFourDigits: string;
  cardholderName: string;
  expiryDate: string;
  status: string;
  type: string;
  createdAt: string;
}

function normalizeCard(raw: BackendCard): Card {
  return {
    id: raw.id,
    userId: raw.userId,
    lastFourDigits: raw.lastFourDigits,
    cardholderName: raw.cardholderName,
    expiryDate: raw.expiryDate,
    status: (raw.status ? raw.status.toLowerCase() : 'active') as CardStatus,
    type: (raw.type ? raw.type.toLowerCase() : 'debit') as 'debit' | 'credit',
  };
}

/**
 * Get all payment cards for authenticated user.
 * Endpoint: GET /api/v1/cards (Authenticated)
 */
export async function getCards(): Promise<Card[]> {
  const data = await api.get<BackendCard[]>('/cards');
  return Array.isArray(data) ? data.map(normalizeCard) : [];
}

/**
 * Create a new payment card.
 * Endpoint: POST /api/v1/cards (Authenticated)
 */
export async function createCard(payload: CreateCardPayload): Promise<Card> {
  const data = await api.post<BackendCard>('/cards', {
    ...payload,
    type: payload.type ? payload.type.toUpperCase() : 'DEBIT',
  });
  return normalizeCard(data);
}

/**
 * Freeze an active card.
 * Endpoint: POST /api/v1/cards/:id/freeze (Authenticated)
 */
export async function freezeCard(id: string): Promise<Card> {
  const data = await api.post<BackendCard>(`/cards/${id}/freeze`);
  return normalizeCard(data);
}

/**
 * Unfreeze a frozen card.
 * Endpoint: POST /api/v1/cards/:id/unfreeze (Authenticated)
 */
export async function unfreezeCard(id: string): Promise<Card> {
  const data = await api.post<BackendCard>(`/cards/${id}/unfreeze`);
  return normalizeCard(data);
}

/**
 * Permanently deactivate a card.
 * Endpoint: POST /api/v1/cards/:id/deactivate (Authenticated)
 */
export async function deactivateCard(id: string): Promise<Card> {
  const data = await api.post<BackendCard>(`/cards/${id}/deactivate`);
  return normalizeCard(data);
}

/**
 * Delete a card.
 * Endpoint: DELETE /api/v1/cards/:id (Authenticated)
 */
export async function deleteCard(id: string): Promise<void> {
  return api.delete<void>(`/cards/${id}`);
}
