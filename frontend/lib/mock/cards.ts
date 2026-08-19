import cardsData from '@/test-data/cards.json';
import { Card, CardStatus } from '@/types';

const seedCards: Card[] = (cardsData as Card[]) || [];

export const MOCK_CARDS_STORAGE_KEY = 'wrightpay_mock_cards';
export const MOCK_DELETED_CARDS_STORAGE_KEY = 'wrightpay_mock_deleted_cards';
export const MOCK_CARD_STATUS_OVERRIDES_STORAGE_KEY = 'wrightpay_mock_card_status_overrides';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function getStoredCards(): Card[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(MOCK_CARDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredCards(cards: Card[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(MOCK_CARDS_STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // Fallback
  }
}

function getDeletedCardIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(MOCK_DELETED_CARDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDeletedCardIds(ids: string[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(MOCK_DELETED_CARDS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Fallback
  }
}

function getStatusOverrides(): Record<string, CardStatus> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(MOCK_CARD_STATUS_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveStatusOverrides(overrides: Record<string, CardStatus>): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(MOCK_CARD_STATUS_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Fallback
  }
}

/**
 * Returns all mock cards (stored runtime cards + active seed cards).
 */
export function getCards(): Card[] {
  const stored = getStoredCards();
  const deletedIds = new Set(getDeletedCardIds());
  const statusOverrides = getStatusOverrides();
  const storedIds = new Set(stored.map((c) => c.id));

  const activeSeeds = seedCards
    .filter((c) => !storedIds.has(c.id) && !deletedIds.has(c.id))
    .map((c) => {
      if (statusOverrides[c.id]) {
        return { ...c, status: statusOverrides[c.id] };
      }
      return c;
    });

  return [...stored, ...activeSeeds];
}

/**
 * Returns cards belonging to a specific user.
 */
export function getUserCards(userId?: string): Card[] {
  if (!userId) return [];
  return getCards().filter((c) => c.userId === userId);
}

/**
 * Finds a card by its unique ID.
 */
export function getCardById(id: string): Card | undefined {
  return getCards().find((c) => c.id === id);
}

export interface AddCardParams {
  userId: string;
  cardholderName: string;
  type: 'debit' | 'credit';
  lastFourDigits: string;
  expiryDate: string;
}

/**
 * Adds and persists a new card for the specified user.
 * Stores only display-safe metadata (lastFourDigits, expiryDate, type, cardholderName, status).
 */
export function addMockCard(params: AddCardParams): Card {
  const newCard: Card = {
    id: `crd_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
    userId: params.userId,
    lastFourDigits: params.lastFourDigits.slice(-4),
    cardholderName: params.cardholderName.trim(),
    expiryDate: params.expiryDate.trim(),
    status: 'active',
    type: params.type,
  };

  const stored = getStoredCards();
  const updated = [newCard, ...stored];
  saveStoredCards(updated);
  return newCard;
}

/**
 * Updates the status of an existing card (Active, Frozen, Deactivated).
 */
export function updateCardStatus(userId: string, cardId: string, newStatus: CardStatus): Card | null {
  const stored = getStoredCards();
  const storedIndex = stored.findIndex((c) => c.id === cardId && c.userId === userId);

  if (storedIndex >= 0) {
    const current = stored[storedIndex];
    if (current.status === 'deactivated') {
      return current; // Deactivated cards cannot be changed
    }
    const updated = { ...current, status: newStatus };
    stored[storedIndex] = updated;
    saveStoredCards(stored);
    return updated;
  }

  // Check if it's a seed card
  const seed = seedCards.find((c) => c.id === cardId && c.userId === userId);
  if (seed) {
    const overrides = getStatusOverrides();
    if (overrides[cardId] === 'deactivated') {
      return { ...seed, status: 'deactivated' };
    }
    overrides[cardId] = newStatus;
    saveStatusOverrides(overrides);
    return { ...seed, status: newStatus };
  }

  return null;
}

/**
 * Freezes an active card.
 */
export function freezeCard(userId: string, cardId: string): Card | null {
  return updateCardStatus(userId, cardId, 'frozen');
}

/**
 * Unfreezes a frozen card.
 */
export function unfreezeCard(userId: string, cardId: string): Card | null {
  return updateCardStatus(userId, cardId, 'active');
}

/**
 * Deactivates a card permanently.
 */
export function deactivateCard(userId: string, cardId: string): Card | null {
  return updateCardStatus(userId, cardId, 'deactivated');
}

/**
 * Removes a card belonging to the specified user.
 */
export function deleteCard(userId: string, cardId: string): boolean {
  if (!userId || !cardId) return false;

  const stored = getStoredCards();
  const filtered = stored.filter((c) => !(c.id === cardId && c.userId === userId));
  saveStoredCards(filtered);

  const deletedIds = getDeletedCardIds();
  if (!deletedIds.includes(cardId)) {
    saveDeletedCardIds([...deletedIds, cardId]);
  }

  return true;
}
