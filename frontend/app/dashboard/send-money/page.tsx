'use client';

import { useSyncExternalStore, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentMockUser } from '@/lib/mock/auth';
import { getUserWallet, getExchangeRate, deductUserWalletBalance } from '@/lib/mock/wallets';
import { getUserBeneficiaries } from '@/lib/mock/beneficiaries';
import { createAndPersistTransaction } from '@/lib/mock/transactions';
import { calculateTransferDetails, WRIGHT_PAY_FIXED_FEE } from '@/lib/mock/transfers';
import { formatCurrency } from '@/lib/formatting';
import { Currency, MockTransaction } from '@/types';

type SendStep = 'beneficiary' | 'sourceWallet' | 'amount' | 'destCurrency' | 'review' | 'complete';

const subscribe = () => () => {};

export default function SendMoneyPage() {
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const user = getCurrentMockUser();
  const userWallet = getUserWallet(user);
  const beneficiaries = isMounted ? getUserBeneficiaries(user?.id) : [];

  const [step, setStep] = useState<SendStep>('beneficiary');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string | null>(null);
  const [selectedSourceWallet, setSelectedSourceWallet] = useState<string | null>(userWallet.id);
  const [amount, setAmount] = useState('');
  const [destCurrency, setDestCurrency] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedTransaction, setCompletedTransaction] = useState<MockTransaction | null>(null);

  const currentBeneficiary = beneficiaries.find((b) => b.id === selectedBeneficiary);
  const targetCurrency = (destCurrency || currentBeneficiary?.currency || userWallet.currency) as Currency;
  const currentRate = getExchangeRate(userWallet.currency, targetCurrency);

  const amountNum = parseFloat(amount) || 0;
  const calculation = calculateTransferDetails({
    sendAmount: amountNum,
    sourceCurrency: userWallet.currency,
    destinationCurrency: targetCurrency,
  });

  const totalWithFee = calculation.totalDebitAmount;
  const recipientEstimated = calculation.recipientAmount;

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

  const handleConfirmTransfer = () => {
    if (!user) return;

    if (totalWithFee > userWallet.balance) {
      setErrorMessage(
        `Insufficient balance in your ${userWallet.currency} wallet. Total required: ${formatCurrency(
          totalWithFee,
          userWallet.currency
        )}, available: ${formatCurrency(userWallet.balance, userWallet.currency)}.`
      );
      return;
    }

    const updatedWallet = deductUserWalletBalance(user.id, totalWithFee);
    if (!updatedWallet) {
      setErrorMessage('Transfer could not be processed. Please check your balance.');
      return;
    }

    const newTx = createAndPersistTransaction({
      userId: user.id,
      recipient: currentBeneficiary?.name || 'Beneficiary',
      amount: amountNum,
      currency: userWallet.currency,
      senderAmount: amountNum,
      senderCurrency: userWallet.currency,
      recipientAmount: recipientEstimated,
      recipientCurrency: targetCurrency,
      fee: WRIGHT_PAY_FIXED_FEE,
      exchangeRate: currentRate,
    });

    setCompletedTransaction(newTx);
    setErrorMessage(null);
    setStep('complete');
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

          {/* Step 1: Select Beneficiary */}
          {step === 'beneficiary' && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 space-y-4 border border-slate-200 dark:border-slate-800 transition-colors">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Select Beneficiary</h2>
              <div className="space-y-3">
                {isMounted && beneficiaries.length > 0 ? (
                  beneficiaries.map((beneficiary) => (
                    <button
                      key={beneficiary.id}
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
                ) : isMounted ? (
                  <div className="p-4 text-center text-sm text-slate-600 dark:text-slate-400">
                    No beneficiaries found. Please add a beneficiary first.
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
                <button
                  key={userWallet.id}
                  onClick={() => setSelectedSourceWallet(userWallet.id)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-colors cursor-pointer ${
                    selectedSourceWallet === userWallet.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {isMounted ? userWallet.currency : ''}
                    </div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {isMounted ? formatCurrency(userWallet.balance, userWallet.currency) : ''}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {isMounted ? `Primary funding balance (${user.name})` : 'Primary funding balance'}
                  </div>
                </button>
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
                  disabled={!selectedSourceWallet}
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
                  Amount to send {isMounted ? `(${userWallet.currency})` : ''}
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Amount:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {isMounted ? formatCurrency(amountNum, userWallet.currency) : ''}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">WrightPay Fee:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {isMounted ? formatCurrency(WRIGHT_PAY_FIXED_FEE, userWallet.currency) : ''}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                  <span className="font-medium text-slate-900 dark:text-slate-100">Total:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {isMounted ? formatCurrency(totalWithFee, userWallet.currency) : ''}
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
              {destCurrency && isMounted && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Exchange Rate (Live)</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{currentRate.toFixed(4)}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">{userWallet.currency} to {destCurrency}</div>
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
                  disabled={!destCurrency}
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
                    {isMounted ? `${userWallet.currency} Wallet` : 'Wallet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Amount:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {isMounted ? formatCurrency(amountNum, userWallet.currency) : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Fee:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {isMounted ? formatCurrency(WRIGHT_PAY_FIXED_FEE, userWallet.currency) : ''}
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex justify-between">
                  <span className="font-medium text-slate-900 dark:text-slate-100">Total Debit:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isMounted ? formatCurrency(totalWithFee, userWallet.currency) : ''}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg p-4">
                <p className="text-sm text-slate-900 dark:text-slate-100">
                  <span className="font-semibold">Recipient receives approximately:</span>{' '}
                  {isMounted ? formatCurrency(recipientEstimated, targetCurrency) : ''}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleBack}
                  className="flex-1 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmTransfer}
                  className="flex-1 bg-green-600 text-white font-medium py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
          )}

          {/* Complete */}
          {step === 'complete' && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 text-center space-y-6 border border-slate-200 dark:border-slate-800 transition-colors">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Transfer Initiated</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Your transfer has been submitted for processing. Reference:{' '}
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {completedTransaction?.reference || 'WP-20260818-001'}
                  </span>
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-left space-y-2 text-sm border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Recipient:</span>
                  <span className="float-right font-medium text-slate-900 dark:text-slate-100">
                    {completedTransaction?.recipient || currentBeneficiary?.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Status:</span>
                  <span className="float-right font-medium text-amber-600 dark:text-amber-400">
                    {completedTransaction?.status || 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Total Debited:</span>
                  <span className="float-right font-medium text-slate-900 dark:text-slate-100">
                    {isMounted ? formatCurrency(totalWithFee, userWallet.currency) : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Recipient Receives:</span>
                  <span className="float-right font-medium text-slate-900 dark:text-slate-100">
                    {isMounted
                      ? formatCurrency(
                          completedTransaction?.recipientAmount || recipientEstimated,
                          targetCurrency
                        )
                      : ''}
                  </span>
                </div>
              </div>
              <a
                href="/dashboard/transactions"
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
              >
                View Transactions
              </a>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
