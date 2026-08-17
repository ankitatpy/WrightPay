'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { mockUser, mockCards } from '@/lib/mock-data';

export default function CardsPage() {
  return (
    <DashboardLayout user={mockUser}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Cards</h1>
          <p className="text-slate-600 mt-2">Manage your payment cards</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockCards.map((card) => (
            <div
              key={card.id}
              className={`rounded-lg p-6 h-48 flex flex-col justify-between text-white ${
                card.status === 'active'
                  ? 'bg-gradient-to-br from-slate-800 to-slate-900'
                  : 'bg-gradient-to-br from-slate-400 to-slate-500 opacity-75'
              }`}
            >
              <div>
                <p className="text-sm opacity-75">Card Number</p>
                <p className="text-xl font-mono tracking-widest">•••• •••• •••• {card.lastFourDigits}</p>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs opacity-75">CARDHOLDER NAME</p>
                  <p className="font-medium">{card.cardholderName}</p>
                </div>
                <div>
                  <p className="text-xs opacity-75">VALID THRU</p>
                  <p className="font-medium">{card.expiryDate}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Card Details */}
        <div className="mt-8 space-y-4">
          {mockCards.map((card) => (
            <div
              key={`details-${card.id}`}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {card.type.charAt(0).toUpperCase() + card.type.slice(1)} Card
                  </h3>
                  <p className="text-slate-600 text-sm">Ending in {card.lastFourDigits}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  card.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : card.status === 'declined'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-slate-600">Cardholder</p>
                  <p className="font-medium text-slate-900">{card.cardholderName}</p>
                </div>
                <div>
                  <p className="text-slate-600">Expiry</p>
                  <p className="font-medium text-slate-900">{card.expiryDate}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {card.status === 'active' && (
                  <>
                    <button className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded hover:bg-slate-200 transition-colors text-sm">
                      Edit
                    </button>
                    <button className="flex-1 bg-red-50 text-red-700 font-medium py-2 rounded hover:bg-red-100 transition-colors text-sm">
                      Deactivate
                    </button>
                  </>
                )}
                {card.status === 'declined' && (
                  <button className="w-full bg-slate-100 text-slate-700 font-medium py-2 rounded hover:bg-slate-200 transition-colors text-sm" disabled>
                    Card Declined
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Card */}
        <div className="mt-8 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-6 text-center">
          <svg
            className="w-12 h-12 text-blue-600 mx-auto mb-3"
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
          <h3 className="font-semibold text-slate-900 mb-1">Add a New Card</h3>
          <p className="text-slate-600 text-sm mb-4">
            Add a debit or credit card for payments
          </p>
          <button className="inline-block bg-blue-600 text-white font-medium px-6 py-2 rounded hover:bg-blue-700 transition-colors">
            Add Card
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
