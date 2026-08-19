'use client';

import { useSyncExternalStore } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentMockUser } from '@/lib/mock/auth';
import { useTheme } from '@/lib/theme-context';

const subscribe = () => () => {};

export default function ProfilePage() {
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const { theme, toggleTheme } = useTheme();
  const user = getCurrentMockUser();

  const nameParts = (isMounted ? user?.name || '' : '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return (
    <DashboardLayout user={user}>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Profile</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your account information</p>
        </div>

        {/* Profile Info */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 mb-6 border border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-2xl font-bold text-white">
                {isMounted && user?.name ? user.name.charAt(0) : ''}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isMounted ? (user?.name || 'User') : ''}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {isMounted ? user?.email : ''}
              </p>
            </div>
          </div>

          <button className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-4 py-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-sm">
            Upload Photo
          </button>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 mb-6 border border-slate-200 dark:border-slate-800 transition-colors">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Appearance</h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Dark mode</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Use a dark appearance across WrightPay.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <span className="sr-only">Toggle dark mode</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 mb-6 border border-slate-200 dark:border-slate-800 transition-colors">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">First Name</label>
              <input
                type="text"
                key={user?.id + '-fn'}
                defaultValue={firstName}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">Last Name</label>
              <input
                type="text"
                key={user?.id + '-ln'}
                defaultValue={lastName}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">Email</label>
              <input
                type="email"
                key={user?.id + '-email'}
                defaultValue={isMounted ? user?.email || '' : ''}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">Default Currency</label>
              <select
                key={user?.id + '-currency'}
                defaultValue={isMounted ? user?.defaultCurrency || 'EUR' : 'EUR'}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="AED">AED</option>
                <option value="PLN">PLN</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>
          <button className="mt-4 bg-blue-600 text-white font-medium px-6 py-2 rounded hover:bg-blue-700 transition-colors cursor-pointer text-sm">
            Save Changes
          </button>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 mb-6 border border-slate-200 dark:border-slate-800 transition-colors">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Security</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Password</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Last changed 6 months ago</p>
              </div>
              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer text-sm">Change</button>
            </div>
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Two-Factor Authentication</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Status: Not enabled</p>
              </div>
              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer text-sm">Enable</button>
            </div>
          </div>
        </div>

        {/* KYC Status */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 mb-6 border border-slate-200 dark:border-slate-800 transition-colors">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Verification Status</h3>
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/60 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">KYC Verification</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Your account is verified</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 border border-slate-200 dark:border-slate-800 transition-colors">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded transition-colors cursor-pointer text-sm">
              Download Account Data
            </button>
            <button className="w-full text-left px-4 py-3 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors cursor-pointer text-sm">
              Deactivate Account
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
