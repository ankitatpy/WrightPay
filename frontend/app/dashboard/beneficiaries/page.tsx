'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { mockUser, mockBeneficiaries, MAX_BENEFICIARIES } from '@/lib/mock-data';
import { formatAccountNumber } from '@/lib/formatting';

export default function BeneficiariesPage() {
  const canAddMore = mockBeneficiaries.length < MAX_BENEFICIARIES;

  return (
    <DashboardLayout user={mockUser}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Beneficiaries</h1>
          <p className="text-slate-600 mt-2">
            You can save up to {MAX_BENEFICIARIES} beneficiaries for quick transfers
          </p>
        </div>

        {/* Beneficiary Count */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Saved Beneficiaries</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {mockBeneficiaries.length} of {MAX_BENEFICIARIES}
              </p>
            </div>
            <div className="w-24 h-24">
              <div className="relative w-24 h-24">
                <svg className="transform -rotate-90 w-24 h-24" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="8"
                    strokeDasharray={`${(mockBeneficiaries.length / MAX_BENEFICIARIES) * 283} 283`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-900">
                  {Math.round((mockBeneficiaries.length / MAX_BENEFICIARIES) * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Beneficiaries List */}
        <div className="space-y-4 mb-6">
          {mockBeneficiaries.map((beneficiary) => (
            <div
              key={beneficiary.id}
              className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">{beneficiary.name}</h3>
                  <p className="text-slate-600 text-sm">{beneficiary.currency} Account</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded hover:bg-slate-200 transition-colors">
                    Edit
                  </button>
                  <button className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded hover:bg-red-100 transition-colors">
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600 mb-1">Account Number</p>
                  <p className="font-mono text-slate-900">{formatAccountNumber(beneficiary.accountNumber)}</p>
                </div>
                <div>
                  <p className="text-slate-600 mb-1">Bank Code</p>
                  <p className="font-mono text-slate-900">{beneficiary.bankCode}</p>
                </div>
              </div>

              <button className="mt-4 w-full py-2 bg-blue-50 text-blue-600 font-medium rounded hover:bg-blue-100 transition-colors">
                Send Money to {beneficiary.name}
              </button>
            </div>
          ))}
        </div>

        {/* Add Beneficiary */}
        {canAddMore && (
          <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-6 text-center">
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
            <h3 className="font-semibold text-slate-900 mb-1">Add a Beneficiary</h3>
            <p className="text-slate-600 text-sm mb-4">
              You can add {MAX_BENEFICIARIES - mockBeneficiaries.length} more beneficiary
              {MAX_BENEFICIARIES - mockBeneficiaries.length > 1 ? 'ies' : ''}
            </p>
            <button className="inline-block bg-blue-600 text-white font-medium px-6 py-2 rounded hover:bg-blue-700 transition-colors">
              Add Beneficiary
            </button>
          </div>
        )}

        {!canAddMore && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              You have reached the maximum of {MAX_BENEFICIARIES} beneficiaries. Remove one to add another.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
