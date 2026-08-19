'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { verifyMockCode } from '@/lib/mock/auth';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [email] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('wrightpay_signup_email') || '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [error, setError] = useState<string>('');
  const [resendSuccess, setResendSuccess] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (trimmedCode.length !== 6) {
      setError('Verification code must be 6 digits.');
      return;
    }

    const isValid = verifyMockCode(email || '', trimmedCode);
    if (isValid) {
      router.push('/onboarding');
    } else {
      setError('Invalid verification code. Please enter 123456 for testing.');
    }
  };

  const handleResend = () => {
    setResendSuccess(true);
    setError('');
    setTimeout(() => setResendSuccess(false), 4000);
  };

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
              {email ? (
                <>
                  We&apos;ve sent a verification code to{' '}
                  <span className="font-medium text-slate-900">{email}</span>
                </>
              ) : (
                <>We&apos;ve sent a verification code to your email address</>
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-slate-900 mb-2">
                Verification code
              </label>
              <input
                type="text"
                id="code"
                name="code"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ''));
                  if (error) setError('');
                }}
                className={`w-full px-4 py-2 bg-white text-slate-900 placeholder:text-slate-400 border ${
                  error ? 'border-red-500' : 'border-slate-300'
                } rounded-lg focus:outline-none focus:ring-2 ${
                  error ? 'focus:ring-red-500' : 'focus:ring-blue-500'
                } focus:border-transparent text-center text-lg tracking-widest`}
              />
              {error && (
                <p className="text-xs text-red-600 mt-2 text-center">{error}</p>
              )}
              <p className="text-xs text-slate-600 mt-2 text-center">
                Check your email for a 6-digit code (use <span className="font-mono font-medium text-slate-800">123456</span> for testing)
              </p>
            </div>

            {resendSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 text-center">
                A new verification code (123456) has been sent.
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors mt-6 cursor-pointer"
            >
              Verify email
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600">
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                className="text-blue-600 font-medium hover:text-blue-700 cursor-pointer"
              >
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
