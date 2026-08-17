'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { mockUser, mockBeneficiaries, mockWallets, WRIGHT_PAY_FEE } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/formatting';
import { useState } from 'react';

type SendStep = 'beneficiary' | 'sourceWallet' | 'amount' | 'destCurrency' | 'review' | 'complete';

export default function SendMoneyPage() {
  const [step, setStep] = useState<SendStep>('beneficiary');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string | null>(null);
  const [selectedSourceWallet, setSelectedSourceWallet] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [destCurrency, setDestCurrency] = useState('');

  const handleNext = () => {
    const steps: SendStep[] = ['beneficiary', 'sourceWallet', 'amount', 'destCurrency', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else {
      setStep('complete');
    }
  };

  const handleBack = () => {
    const steps: SendStep[] = ['beneficiary', 'sourceWallet', 'amount', 'destCurrency', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const amountNum = parseFloat(amount) || 0;
  const totalWithFee = amountNum + WRIGHT_PAY_FEE;

  const progressSteps = [
    'Beneficiary',
    'Source Wallet',
    'Amount',
    'Destination',
    'Review',
  ];
  const currentProgressIndex = progressSteps.findIndex((_, i) =>
    ['beneficiary', 'sourceWallet', 'amount', 'destCurrency', 'review'].includes(
      step as any
    )
  );

  return (
    <DashboardLayout user={mockUser}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Send Money</h1>
          <p className="text-slate-600 mt-2">Transfer funds to your beneficiaries</p>
        </div>

        <div className="max-w-2xl">
          {/* Progress Indicator */}
          <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              {progressSteps.map((s, i) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      i <= currentProgressIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < progressSteps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        i < currentProgressIndex ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-slate-600">
              Step {currentProgressIndex + 1} of {progressSteps.length}: {progressSteps[currentProgressIndex]}
            </p>
          </div>

          {/* Step 1: Select Beneficiary */}
          {step === 'beneficiary' && (
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Select Beneficiary</h2>
              <div className="space-y-3">
                {mockBeneficiaries.map((beneficiary) => (
                  <button
                    key={beneficiary.id}
                    onClick={() => setSelectedBeneficiary(beneficiary.id)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedBeneficiary === beneficiary.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium text-slate-900">{beneficiary.name}</div>
                    <div className="text-sm text-slate-600">
                      {beneficiary.currency} • {beneficiary.bankCode}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleNext}
                disabled={!selectedBeneficiary}
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {/* Step 2: Select Source Wallet */}
          {step === 'sourceWallet' && (
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Select Source Wallet</h2>
              <div className="space-y-3">
                {mockWallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => setSelectedSourceWallet(wallet.id)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedSourceWallet === wallet.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-slate-900">{wallet.currency}</div>
                      <div className="font-medium text-slate-900">
                        {formatCurrency(wallet.balance, wallet.currency)}
                      </div>
                    </div>
                    {wallet.isDefault && (
                      <div className="text-xs text-slate-600 mt-1">Default wallet</div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleBack}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!selectedSourceWallet}
                  className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Enter Amount */}
          {step === 'amount' && (
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Enter Amount</h2>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Amount to send
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Amount:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(amountNum, 'EUR')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">WrightPay Fee:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(WRIGHT_PAY_FEE, 'EUR')}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between">
                  <span className="font-medium text-slate-900">Total:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(totalWithFee, 'EUR')}</span>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleBack}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Select Destination Currency */}
          {step === 'destCurrency' && (
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Select Destination Currency</h2>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Convert to
                </label>
                <select
                  value={destCurrency}
                  onChange={(e) => setDestCurrency(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-2">Exchange Rate (Mock)</div>
                  <div className="text-2xl font-bold text-slate-900">1.0925</div>
                  <div className="text-xs text-slate-600 mt-2">EUR to {destCurrency}</div>
                </div>
              )}
              <div className="flex gap-4">
                <button
                  onClick={handleBack}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!destCurrency}
                  className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 'review' && (
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-semibold text-slate-900">Review Transfer</h2>

              <div className="space-y-4 bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">Beneficiary:</span>
                  <span className="font-medium text-slate-900">
                    {mockBeneficiaries.find((b) => b.id === selectedBeneficiary)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">From:</span>
                  <span className="font-medium text-slate-900">
                    {mockWallets.find((w) => w.id === selectedSourceWallet)?.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(amountNum, 'EUR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Fee:</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(WRIGHT_PAY_FEE, 'EUR')}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-4 flex justify-between">
                  <span className="font-medium text-slate-900">Total Debit:</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(totalWithFee, 'EUR')}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-slate-900">
                  <span className="font-semibold">Recipient receives approximately:</span> $
                  {(amountNum * 1.09).toFixed(2)} USD
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleBack}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 bg-green-600 text-white font-medium py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
          )}

          {/* Complete */}
          {step === 'complete' && (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-green-600"
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
                <h2 className="text-2xl font-bold text-slate-900">Transfer Initiated</h2>
                <p className="text-slate-600 mt-2">
                  Your transfer has been submitted for processing. Reference: WP-20240817-006
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-left space-y-2 text-sm">
                <div>
                  <span className="text-slate-600">Status:</span>
                  <span className="float-right font-medium text-slate-900">Pending</span>
                </div>
                <div>
                  <span className="text-slate-600">Amount:</span>
                  <span className="float-right font-medium text-slate-900">{formatCurrency(totalWithFee, 'EUR')}</span>
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
