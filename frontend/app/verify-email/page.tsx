'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function VerifyEmailPage() {
  const [code, setCode] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Verify your email</h1>
            <p className="text-slate-600 mt-2">
              We've sent a verification code to your email address
            </p>
          </div>

          <form className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-slate-900 mb-2">
                Verification code
              </label>
              <input
                type="text"
                id="code"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
              />
              <p className="text-xs text-slate-600 mt-2">
                Check your email for a 6-digit code
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors mt-6"
            >
              Verify email
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600">
              Didn't receive the code?{' '}
              <button className="text-blue-600 font-medium hover:text-blue-700">
                Resend
              </button>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
