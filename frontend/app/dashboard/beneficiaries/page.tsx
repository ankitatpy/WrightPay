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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Beneficiaries</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            You can save up to {MAX_BENEFICIARIES} beneficiaries for quick transfers
          </p>
        </div>

        {/* Beneficiary Count */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 mb-6 border border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Saved Beneficiaries</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
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
                    stroke="#334155"
                    className="stroke-slate-200 dark:stroke-slate-700"
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
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-900 dark:text-white">
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
              className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{beneficiary.name}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{beneficiary.currency} Account</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                    Edit
                  </button>
                  <button className="px-3 py-1 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer">
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600 dark:text-slate-400 mb-1">Account Number</p>
                  <p className="font-mono text-slate-900 dark:text-slate-200">{formatAccountNumber(beneficiary.accountNumber)}</p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400 mb-1">Bank Code</p>
                  <p className="font-mono text-slate-900 dark:text-slate-200">{beneficiary.bankCode}</p>
                </div>
              </div>

              <button className="mt-4 w-full py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer">
                Send Money to {beneficiary.name}
              </button>
            </div>
          ))}
        </div>

        {/* Add Beneficiary */}
        {canAddMore && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-dashed border-blue-300 dark:border-blue-800/80 rounded-lg p-6 text-center transition-colors">
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
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Add a Beneficiary</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              You can add {MAX_BENEFICIARIES - mockBeneficiaries.length} more beneficiary
              {MAX_BENEFICIARIES - mockBeneficiaries.length > 1 ? 'ies' : ''}
            </p>
            <button className="inline-block bg-blue-600 text-white font-medium px-6 py-2 rounded hover:bg-blue-700 transition-colors cursor-pointer">
              Add Beneficiary
            </button>
          </div>
        )}

        {!canAddMore && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You have reached the maximum of {MAX_BENEFICIARIES} beneficiaries. Remove one to add another.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
