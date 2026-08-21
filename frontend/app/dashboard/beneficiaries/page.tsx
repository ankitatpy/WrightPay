'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import {
  getBeneficiaries,
  createBeneficiary,
  deleteBeneficiary,
} from '@/lib/api/beneficiaries';
import { formatAccountNumber } from '@/lib/formatting';
import { Beneficiary, BeneficiaryPayoutMethod, Currency } from '@/types';

const MAX_BENEFICIARIES = 3;

export default function BeneficiariesPage() {
  const { user } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [payoutMethod, setPayoutMethod] = useState<BeneficiaryPayoutMethod>('bank_account');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBeneficiaries = () => {
    setIsLoading(true);
    setPageError(null);
    getBeneficiaries()
      .then((data) => {
        setBeneficiaries(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load beneficiaries';
        setPageError(message);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    getBeneficiaries()
      .then((data) => {
        if (!isCancelled) {
          setBeneficiaries(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load beneficiaries';
          setPageError(message);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);


  const canAddMore = beneficiaries.length < MAX_BENEFICIARIES;

  const handleOpenModal = () => {
    setName('');
    setCurrency(user?.defaultCurrency || 'EUR');
    setPayoutMethod('bank_account');
    setAccountNumber('');
    setBankName('');
    setBankCode('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    if (!name.trim()) {
      setFormError('Please enter a beneficiary name.');
      return;
    }
    if (!accountNumber.trim()) {
      setFormError(
        payoutMethod === 'upi' ? 'Please enter a valid UPI ID.' : 'Please enter an account number / IBAN.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const payload =
        payoutMethod === 'upi'
          ? {
              name: name.trim(),
              currency,
              payoutMethod: 'upi' as const,
              upiId: accountNumber.trim(),
            }
          : {
              name: name.trim(),
              currency,
              payoutMethod: 'bank_account' as const,
              accountNumber: accountNumber.trim(),
              bankName: bankName.trim() || 'Bank Account',
              bankCode: bankCode.trim() || 'DIRECT',
            };

      await createBeneficiary(payload);
      fetchBeneficiaries();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add beneficiary';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (beneficiaryId: string) => {
    if (!user || deletingId) return;
    try {
      setDeletingId(beneficiaryId);
      await deleteBeneficiary(beneficiaryId);
      setBeneficiaries((prev) => prev.filter((b) => b.id !== beneficiaryId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete beneficiary';
      setPageError(message);
    } finally {
      setDeletingId(null);
    }
  };


  return (
    <DashboardLayout user={user}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Beneficiaries</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            You can save up to {MAX_BENEFICIARIES} beneficiaries for quick transfers
          </p>
        </div>

        {/* Page Error Banner */}
        {pageError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{pageError}</span>
            </div>
            <button
              type="button"
              onClick={fetchBeneficiaries}
              className="text-xs font-semibold px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Beneficiary Count */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 mb-6 border border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Saved Beneficiaries</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {!isLoading ? `${beneficiaries.length} of ${MAX_BENEFICIARIES}` : `... of ${MAX_BENEFICIARIES}`}
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
                    strokeDasharray={`${(beneficiaries.length / MAX_BENEFICIARIES) * 283} 283`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-900 dark:text-white">
                  {!isLoading ? Math.round((beneficiaries.length / MAX_BENEFICIARIES) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Beneficiaries List */}
        <div className="space-y-4 mb-6">
          {!isLoading && beneficiaries.length > 0 ? (
            beneficiaries.map((beneficiary) => (
              <div
                key={beneficiary.id}
                className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{beneficiary.name}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      {beneficiary.currency} Account • {beneficiary.bankName || 'Direct Account'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-sm rounded cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === beneficiary.id}
                      onClick={() => handleRemove(beneficiary.id)}
                      className="px-3 py-1 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm rounded hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {deletingId === beneficiary.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">
                      {beneficiary.payoutMethod === 'upi' ? 'UPI ID' : 'Account Number'}
                    </p>
                    <p className="font-mono text-slate-900 dark:text-slate-200">
                      {beneficiary.payoutMethod === 'upi'
                        ? (beneficiary.upiId || beneficiary.accountNumber)
                        : formatAccountNumber(beneficiary.accountNumber)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">Bank Code / Routing</p>
                    <p className="font-mono text-slate-900 dark:text-slate-200">{beneficiary.bankCode}</p>
                  </div>
                </div>

                <Link
                  href="/dashboard/send-money"
                  className="mt-4 block text-center w-full py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                >
                  Send Money to {beneficiary.name}
                </Link>
              </div>
            ))
          ) : !isLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              No beneficiaries saved yet. Click below to add your first beneficiary.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-800 animate-pulse h-32" />
          )}
        </div>

        {/* Add Beneficiary Card */}
        {!isLoading && canAddMore && (
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
              You can add {MAX_BENEFICIARIES - beneficiaries.length} more beneficiary
              {MAX_BENEFICIARIES - beneficiaries.length > 1 ? 'ies' : ''}
            </p>
            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-block bg-blue-600 text-white font-medium px-6 py-2 rounded hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Add Beneficiary
            </button>
          </div>
        )}

        {!isLoading && !canAddMore && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You have reached the maximum of {MAX_BENEFICIARIES} beneficiaries. Remove one to add another.
            </p>
          </div>
        )}


        {/* Add Beneficiary Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Beneficiary</h2>
                <button
                  type="button"
                  onClick={handleCloseModal}
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

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                    Beneficiary Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fatima Al-Zahra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                      Currency *
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as Currency)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="USD">USD</option>
                      <option value="AED">AED</option>
                      <option value="PLN">PLN</option>
                      <option value="INR">INR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                      Payout Method *
                    </label>
                    <select
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value as BeneficiaryPayoutMethod)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="bank_account">Bank Account</option>
                      <option value="upi">UPI (India only)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                    {payoutMethod === 'upi' ? 'UPI ID / VPA *' : 'Account Number / IBAN *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={payoutMethod === 'upi' ? 'username@okaxis' : 'e.g. AE070330000000000000000'}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  />
                </div>

                {payoutMethod === 'bank_account' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Emirates NBD"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                        Bank Code / SWIFT
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. EBILAEAD"
                        value={bankCode}
                        onChange={(e) => setBankCode(e.target.value)}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-2 px-4 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    Save Beneficiary
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
