'use client';

import { useState } from 'react';

export default function OnboardingPage() {
  const [step, setStep] = useState<'personal' | 'residence' | 'document' | 'pending' | 'approved'>(
    'personal'
  );

  const renderStep = () => {
    switch (step) {
      case 'personal':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  First name
                </label>
                <input
                  type="text"
                  placeholder="Anna"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Last name
                </label>
                <input
                  type="text"
                  placeholder="Kowalski"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Date of birth
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setStep('residence')}
              className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        );

      case 'residence':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Country of Residence</h2>
            <p className="text-slate-600">Where do you currently reside?</p>
            <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Select a country</option>
              <option>Poland</option>
              <option>Germany</option>
              <option>France</option>
              <option>United Kingdom</option>
              <option>Spain</option>
            </select>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep('personal')}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('document')}
                className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Document Upload</h2>
            <p className="text-slate-600">Upload a government-issued ID for verification</p>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <svg
                className="w-12 h-12 text-slate-400 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm text-slate-600 mb-2">Drag and drop your ID here</p>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                or click to select file
              </button>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep('residence')}
                className="flex-1 border border-slate-300 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('pending')}
                className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        );

      case 'pending':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Verification Pending</h2>
            <p className="text-slate-600">
              Your documents are being reviewed. This typically takes 1-2 business days.
            </p>
            <button
              type="button"
              onClick={() => setStep('approved')}
              className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue (Demo)
            </button>
          </div>
        );

      case 'approved':
        return (
          <div className="text-center space-y-4">
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
            <h2 className="text-xl font-semibold text-slate-900">KYC Approved</h2>
            <p className="text-slate-600">
              Welcome to WrightPay. Your account is now fully verified and ready to use.
            </p>
            <a
              href="/dashboard"
              className="inline-block w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">WrightPay</h1>
            <p className="text-slate-600 mt-2">Complete your onboarding</p>
          </div>

          {/* Progress indicator */}
          <div className="mb-8 flex gap-2">
            {['personal', 'residence', 'document', 'pending', 'approved'].map((s, i) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full ${
                  ['personal', 'residence', 'document', 'pending', 'approved'].indexOf(step) >= i
                    ? 'bg-blue-600'
                    : 'bg-slate-300'
                }`}
              />
            ))}
          </div>

          {renderStep()}
        </div>
      </div>
    </div>
  );
}
