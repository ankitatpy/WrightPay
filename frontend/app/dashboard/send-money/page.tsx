'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import { getMyWallet } from '@/lib/api/wallets';
import { getBeneficiaries } from '@/lib/api/beneficiaries';
import { getQuote } from '@/lib/api/exchange-rates';
import { createTransfer } from '@/lib/api/transfers';
import { getTransaction } from '@/lib/api/transactions';
import { formatCurrency } from '@/lib/formatting';
import { Currency, Transaction, ExchangeQuote, WalletResponse, Beneficiary } from '@/types';

type SendStep = 'beneficiary' | 'sourceWallet' | 'amount' | 'destCurrency' | 'review' | 'complete';

export default function SendMoneyPage() {
  const { user } = useAuth();

  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(true);

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isLoadingBeneficiaries, setIsLoadingBeneficiaries] = useState<boolean>(true);

  const [step, setStep] = useState<SendStep>('beneficiary');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [destCurrency, setDestCurrency] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

  // Idempotency key preserved across retries of the same transfer attempt
  const idempotencyKeyRef = useRef<string>('');

  const [quote, setQuote] = useState<ExchangeQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Fetch initial wallet and beneficiaries
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    getMyWallet()
      .then((data) => {
        if (!isCancelled) {
          setWallet(data);
          setIsLoadingWallet(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load wallet for transfer:', err);
        if (!isCancelled) setIsLoadingWallet(false);
      });

    getBeneficiaries()
      .then((data) => {
        if (!isCancelled) {
          setBeneficiaries(Array.isArray(data) ? data : []);
          setIsLoadingBeneficiaries(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load beneficiaries for transfer:', err);
        if (!isCancelled) setIsLoadingBeneficiaries(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);


  const currentBeneficiary = beneficiaries.find((b) => b.id === selectedBeneficiary);
  const sourceCurrency = wallet?.currency || 'EUR';
  const targetCurrency = (destCurrency || currentBeneficiary?.currency || sourceCurrency) as Currency;
  const amountNum = parseFloat(amount) || 0;
  const fixedFee = 25; // 25 EUR fixed transfer fee
  const totalWithFee = amountNum > 0 ? amountNum + fixedFee : 0;

  // Debounced server-side quote fetch whenever amount, source currency, or destination currency changes
  useEffect(() => {
    if (amountNum <= 0 || !sourceCurrency || !targetCurrency) {
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(() => {
      setIsLoadingQuote(true);
      setQuoteError(null);

      getQuote(sourceCurrency, targetCurrency, amountNum)
        .then((res) => {
          if (!isCancelled) {
            setQuote(res);
            setIsLoadingQuote(false);
          }
        })
        .catch((err: unknown) => {
          if (!isCancelled) {
            const message = err instanceof Error ? err.message : 'Failed to fetch conversion quote';
            setQuoteError(message);
            setQuote(null);
            setIsLoadingQuote(false);
          }
        });
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [amountNum, sourceCurrency, targetCurrency]);

  const effectiveQuote = amountNum > 0 ? quote : null;
  const recipientEstimated = effectiveQuote ? effectiveQuote.convertedAmount : 0;
  const currentRate = effectiveQuote ? effectiveQuote.rate : 1.0;

  // Polling worker for BullMQ status transition (PENDING -> PROCESSING -> COMPLETED / FAILED)
  useEffect(() => {
    if (step !== 'complete' || !completedTransaction?.id) return;
    if (completedTransaction.status === 'COMPLETED' || completedTransaction.status === 'FAILED') return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const latest = await getTransaction(completedTransaction.id);
        setCompletedTransaction(latest);

        if (latest.status === 'COMPLETED' || latest.status === 'FAILED' || attempts >= 20) {
          clearInterval(interval);
          // Refresh wallet balance
          getMyWallet().then(setWallet).catch(console.error);
        }
      } catch (err) {
        console.error('Error polling transaction status:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [step, completedTransaction?.id, completedTransaction?.status]);

  const handleNext = () => {
    const steps: SendStep[] = ['beneficiary', 'sourceWallet', 'amount', 'destCurrency', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setErrorMessage(null);
      setStep(steps[currentIndex + 1]);
    } else {
      handleConfirmTransfer();
    }
  };

  const handleBack = () => {
    const steps: SendStep[] = ['beneficiary', 'sourceWallet', 'amount', 'destCurrency', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setErrorMessage(null);
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!user || !wallet || !selectedBeneficiary || isSubmittingTransfer) return;

    if (totalWithFee > wallet.balance) {
      setErrorMessage(
        `Insufficient balance in your ${wallet.currency} wallet. Total required: ${formatCurrency(
          totalWithFee,
          wallet.currency
        )}, available: ${formatCurrency(wallet.balance, wallet.currency)}.`
      );
      return;
    }

    try {
      setIsSubmittingTransfer(true);
      setErrorMessage(null);

      // Generate or reuse stable Idempotency-Key for this attempt
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = `wp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      }

      const tx = await createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: selectedBeneficiary,
          sendAmount: amountNum,
          destinationCurrency: targetCurrency,
        },
        idempotencyKeyRef.current,
      );

      setCompletedTransaction(tx);
      setStep('complete');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transfer failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const progressSteps = [
    'Beneficiary',
    'Source Wallet',
    'Amount',
    'Destination',
    'Review',
  ];
  const stepOrder = ['beneficiary', 'sourceWallet', 'amount', 'destCurrency', 'review'];
  const currentProgressIndex = stepOrder.indexOf(step);

  return (
    <DashboardLayout user={user}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Send Money</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Transfer funds to your beneficiaries</p>
        </div>

        <div className="max-w-2xl">
          {/* Progress Indicator */}
          {step !== 'complete' && (
            <div className="mb-8 bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 border border-slate-200 dark:border-slate-800 transition-colors">
              <div className="flex items-center justify-between mb-6">
                {progressSteps.map((s, i) => (
                  <div key={s} className="flex items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        i <= currentProgressIndex
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {i + 1}
                    </div>
                    {i < progressSteps.length - 1 && (
                      <div
                        className={`flex-1 h-1 mx-2 ${
                          i < currentProgressIndex ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                Step {currentProgressIndex + 1} of {progressSteps.length}: {progressSteps[currentProgressIndex]}
              </p>
            </div>
          )}

          {/* Step 1: Select Beneficiary */}
          {step === 'beneficiary' && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 space-y-4 border border-slate-200 dark:border-slate-800 transition-colors">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Select Beneficiary</h2>
              <div className="space-y-3">
                {!isLoadingBeneficiaries && beneficiaries.length > 0 ? (
                  beneficiaries.map((beneficiary) => (
                    <button
                      key={beneficiary.id}
                      type="button"
                      onClick={() => {
                        setSelectedBeneficiary(beneficiary.id);
                        if (beneficiary.currency) {
                          setDestCurrency(beneficiary.currency);
                        }
                      }}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-colors cursor-pointer ${
                        selectedBeneficiary === beneficiary.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="font-medium text-slate-900 dark:text-white">{beneficiary.name}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {beneficiary.currency} • {beneficiary.bankName || beneficiary.bankCode}
                      </div>
                    </button>
                  ))
                ) : !isLoadingBeneficiaries ? (
                  <div className="p-6 text-center text-sm text-slate-600 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                    No beneficiaries saved yet.{' '}
                    <Link href="/dashboard/beneficiaries" className="text-blue-600 hover:underline font-medium">
                      Add a beneficiary first
                    </Link>
                  </div>
                ) : (
                  <div className="p-8 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                )}
              </div>
              <button
                onClick={handleNext}
                disabled={!selectedBeneficiary}
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          )}

          {/* Step 2: Select Source Wallet */}
          {step === 'sourceWallet' && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 space-y-4 border border-slate-200 dark:border-slate-800 transition-colors">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Select Source Wallet</h2>
              <div className="space-y-3">
                {!isLoadingWallet && wallet ? (
                  <div
                    className="w-full p-4 border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-left"
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {wallet.currency} Wallet
                      </div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {formatCurrency(wallet.balance, wallet.currency)}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Primary funding balance ({user?.name || 'Account Holder'})
                    </div>
                  </div>
                ) : (
                  <div className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleBack}
                  className="flex-1 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!wallet}
                  className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Enter Amount */}
          {step === 'amount' && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 space-y-4 border border-slate-200 dark:border-slate-800 transition-colors">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Enter Amount</h2>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">
                  Amount to send ({sourceCurrency})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Amount:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(amountNum, sourceCurrency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">WrightPay Fixed Fee:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(fixedFee, sourceCurrency)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                  <span className="font-medium text-slate-900 dark:text-slate-100">Total Debit:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(totalWithFee, sourceCurrency)}
                  </span>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleBack}
                  className="flex-1 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Select Destination Currency */}
          {step === 'destCurrency' && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 space-y-4 border border-slate-200 dark:border-slate-800 transition-colors">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Select Destination Currency</h2>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">
                  Convert to
                </label>
                <select
                  value={destCurrency}
                  onChange={(e) => setDestCurrency(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select currency</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="AED">AED (UAE Dirham)</option>
                  <option value="PLN">PLN (Polish Zloty)</option>
                  <option value="INR">INR (Indian Rupee)</option>
                </select>
              </div>
              {destCurrency && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Exchange Rate (Live)</div>
                  {isLoadingQuote ? (
                    <div className="text-sm text-slate-500 animate-pulse">Fetching live quote...</div>
                  ) : quoteError ? (
                    <div className="text-sm text-red-600">{quoteError}</div>
                  ) : effectiveQuote ? (
                    <>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">{effectiveQuote.rate.toFixed(4)}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">{sourceCurrency} to {destCurrency}</div>
                    </>
                  ) : (
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{currentRate.toFixed(4)}</div>
                  )}
                </div>
              )}
              <div className="flex gap-4">
                <button
                  onClick={handleBack}
                  className="flex-1 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!destCurrency || isLoadingQuote || !!quoteError}
                  className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 'review' && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 space-y-6 border border-slate-200 dark:border-slate-800 transition-colors">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Review Transfer</h2>

              {errorMessage && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Beneficiary:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {currentBeneficiary?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">From:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {sourceCurrency} Wallet
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Amount:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(amountNum, sourceCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">WrightPay Fixed Fee:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(fixedFee, sourceCurrency)}
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex justify-between">
                  <span className="font-medium text-slate-900 dark:text-slate-100">Total Debit:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(totalWithFee, sourceCurrency)}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg p-4">
                <p className="text-sm text-slate-900 dark:text-slate-100">
                  <span className="font-semibold">Recipient receives approximately:</span>{' '}
                  {isLoadingQuote ? (
                    <span className="text-slate-500 animate-pulse">Fetching quote...</span>
                  ) : quoteError ? (
                    <span className="text-red-600">{quoteError}</span>
                  ) : (
                    formatCurrency(recipientEstimated, targetCurrency)
                  )}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleBack}
                  disabled={isSubmittingTransfer}
                  className="flex-1 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmTransfer}
                  disabled={isSubmittingTransfer || isLoadingQuote || !!quoteError}
                  className="flex-1 bg-green-600 text-white font-medium py-2 rounded-lg hover:bg-green-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 transition-colors cursor-pointer"
                >
                  {isSubmittingTransfer ? 'Submitting Transfer...' : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Complete & Real-Time Processing Status */}
          {step === 'complete' && completedTransaction && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 text-center space-y-6 border border-slate-200 dark:border-slate-800 transition-colors">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                  completedTransaction.status === 'COMPLETED'
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                    : completedTransaction.status === 'FAILED'
                    ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 animate-pulse'
                }`}
              >
                {completedTransaction.status === 'COMPLETED' ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : completedTransaction.status === 'FAILED' ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {completedTransaction.status === 'COMPLETED'
                    ? 'Transfer Completed'
                    : completedTransaction.status === 'FAILED'
                    ? 'Transfer Failed'
                    : 'Processing Transfer'}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Reference:{' '}
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {completedTransaction.reference}
                  </span>
                </p>
                {completedTransaction.failureReason && (
                  <p className="text-sm text-red-600 mt-1 font-medium">
                    Reason: {completedTransaction.failureReason}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-left space-y-2 text-sm border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Recipient:</span>
                  <span className="float-right font-medium text-slate-900 dark:text-slate-100">
                    {completedTransaction.recipient}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Status:</span>
                  <span
                    className={`float-right font-semibold ${
                      completedTransaction.status === 'COMPLETED'
                        ? 'text-green-600 dark:text-green-400'
                        : completedTransaction.status === 'FAILED'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {completedTransaction.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Total Debited:</span>
                  <span className="float-right font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(totalWithFee, sourceCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Recipient Receives:</span>
                  <span className="float-right font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(
                      completedTransaction.recipientAmount || recipientEstimated,
                      targetCurrency,
                    )}
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard/transactions"
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block cursor-pointer"
              >
                View in Transactions
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

