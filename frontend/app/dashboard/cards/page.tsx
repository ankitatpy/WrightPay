'use client';

import { useSyncExternalStore, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentMockUser } from '@/lib/mock/auth';
import {
  getUserCards,
  addMockCard,
  freezeCard,
  unfreezeCard,
  deactivateCard,
  deleteCard,
} from '@/lib/mock/cards';
import { Card } from '@/types';

const subscribe = () => () => {};

export default function CardsPage() {
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const user = getCurrentMockUser();
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [cardType, setCardType] = useState<'debit' | 'credit'>('debit');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('12');
  const [expiryYear, setExpiryYear] = useState('28');
  const [cvv, setCvv] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Deactivate Confirmation Modal State
  const [deactivatingCard, setDeactivatingCard] = useState<Card | null>(null);

  const cards = isMounted ? getUserCards(user?.id) : [];

  const handleOpenAddModal = () => {
    setCardholderName(user?.name || '');
    setCardType('debit');
    setCardNumber('');
    setExpiryMonth('12');
    setExpiryYear('28');
    setCvv('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setFormError(null);
  };

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!cardholderName.trim()) {
      setFormError('Please enter the cardholder name.');
      return;
    }

    const cleanNumber = cardNumber.replace(/\s+/g, '');
    if (cleanNumber.length < 15 || !/^\d+$/.test(cleanNumber)) {
      setFormError('Please enter a valid 15 or 16-digit card number.');
      return;
    }

    if (!/^\d{3,4}$/.test(cvv.trim())) {
      setFormError('Please enter a valid 3 or 4-digit CVV.');
      return;
    }

    const expiryDate = `${expiryMonth.padStart(2, '0')}/${expiryYear.slice(-2)}`;

    addMockCard({
      userId: user.id,
      cardholderName: cardholderName.trim(),
      type: cardType,
      lastFourDigits: cleanNumber.slice(-4),
      expiryDate,
    });

    setRefreshKey((prev) => prev + 1);
    setIsAddModalOpen(false);
  };

  const handleToggleFreeze = (card: Card) => {
    if (!user) return;
    if (card.status === 'active') {
      freezeCard(user.id, card.id);
    } else if (card.status === 'frozen') {
      unfreezeCard(user.id, card.id);
    }
    setRefreshKey((prev) => prev + 1);
  };

  const handleConfirmDeactivate = () => {
    if (!user || !deactivatingCard) return;
    deactivateCard(user.id, deactivatingCard.id);
    setDeactivatingCard(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleDelete = (cardId: string) => {
    if (!user) return;
    deleteCard(user.id, cardId);
    setRefreshKey((prev) => prev + 1);
  };

  const formatCardInputNumber = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    return raw.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  return (
    <DashboardLayout user={user}>
      <div className="p-8" key={refreshKey}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Cards</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your payment cards</p>
        </div>

        {/* Visual Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isMounted && cards.length > 0 ? (
            cards.map((card) => (
              <div
                key={card.id}
                className={`rounded-xl p-6 h-52 flex flex-col justify-between text-white transition-all shadow-md ${
                  card.status === 'active'
                    ? 'bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 border border-slate-700/60'
                    : card.status === 'frozen'
                    ? 'bg-gradient-to-br from-cyan-950 via-slate-900 to-blue-950 border border-cyan-600/50'
                    : card.status === 'deactivated'
                    ? 'bg-gradient-to-br from-slate-700 to-slate-850 opacity-60 border border-slate-700'
                    : 'bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-700 dark:to-slate-800 opacity-75'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">
                      WrightPay {card.type}
                    </p>
                    <p className="text-xl font-mono tracking-widest mt-2">
                      •••• •••• •••• {card.lastFourDigits}
                    </p>
                  </div>
                  {card.status === 'frozen' && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      ❄️ Frozen
                    </span>
                  )}
                  {card.status === 'deactivated' && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40">
                      Deactivated
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider opacity-75">Cardholder Name</p>
                    <p className="font-medium text-sm tracking-wide">{card.cardholderName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider opacity-75">Valid Thru</p>
                    <p className="font-medium text-sm font-mono">{card.expiryDate}</p>
                  </div>
                </div>
              </div>
            ))
          ) : isMounted ? (
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              No payment cards saved yet. Click below to add a card.
            </div>
          ) : (
            <>
              <div className="rounded-xl p-6 h-52 bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="rounded-xl p-6 h-52 bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </>
          )}
        </div>

        {/* Card Details & Management Controls */}
        {isMounted && cards.length > 0 && (
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Card Management</h2>
            {cards.map((card) => (
              <div
                key={`details-${card.id}`}
                className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 border border-slate-200 dark:border-slate-800 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                      {card.type.charAt(0).toUpperCase() + card.type.slice(1)} Card ending in {card.lastFourDigits}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Expires {card.expiryDate} • {card.cardholderName}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      card.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-950/70 dark:text-green-300 dark:border dark:border-green-800/50'
                        : card.status === 'frozen'
                        ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border dark:border-cyan-800/50'
                        : card.status === 'deactivated'
                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:border dark:border-slate-700'
                        : 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 dark:border dark:border-red-800/50'
                    }`}
                  >
                    {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  {card.status === 'active' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleFreeze(card)}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm cursor-pointer"
                      >
                        ❄️ Freeze Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeactivatingCard(card)}
                        className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-sm cursor-pointer"
                      >
                        Deactivate
                      </button>
                    </>
                  )}

                  {card.status === 'frozen' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleFreeze(card)}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm cursor-pointer"
                      >
                        ⚡ Unfreeze Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeactivatingCard(card)}
                        className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-sm cursor-pointer"
                      >
                        Deactivate
                      </button>
                    </>
                  )}

                  {card.status === 'deactivated' && (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-medium rounded-lg text-sm cursor-not-allowed"
                    >
                      Permanently Deactivated
                    </button>
                  )}

                  {card.status === 'declined' && (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-medium rounded-lg text-sm cursor-not-allowed"
                    >
                      Card Declined
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(card.id)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm cursor-pointer ml-auto"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Card Card */}
        {isMounted && (
          <div className="mt-8 bg-blue-50 dark:bg-blue-950/30 border-2 border-dashed border-blue-300 dark:border-blue-800/80 rounded-lg p-6 text-center transition-colors">
            <svg
              className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Add a New Card</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Add a debit or credit card for payments
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-block bg-blue-600 text-white font-medium px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Add Card
            </button>
          </div>
        )}

        {/* Add Card Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Payment Card</h2>
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddCardSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                    Cardholder Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tariq Al-Mansoor"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                    Card Type *
                  </label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value as 'debit' | 'credit')}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="debit">Debit Card</option>
                    <option value="credit">Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                    Card Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="4532 0158 9234 5678"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardInputNumber(e.target.value))}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono tracking-wider"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                      Expiry Date *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={expiryMonth}
                        onChange={(e) => setExpiryMonth(e.target.value)}
                        className="w-1/2 px-2 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={expiryYear}
                        onChange={(e) => setExpiryYear(e.target.value)}
                        className="w-1/2 px-2 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {['26', '27', '28', '29', '30', '31', '32', '33'].map((y) => (
                          <option key={y} value={y}>
                            20{y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                      CVV / CVC *
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    className="flex-1 py-2 px-4 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    Add Card
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deactivate Confirmation Modal */}
        {deactivatingCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deactivate Card</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Are you sure you want to deactivate your {deactivatingCard.type} card ending in{' '}
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {deactivatingCard.lastFourDigits}
                </span>
                ? This action cannot be undone and the card will be permanently disabled.
              </p>
              <div className="pt-4 flex gap-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeactivatingCard(null)}
                  className="flex-1 py-2 px-4 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeactivate}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Confirm Deactivate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
