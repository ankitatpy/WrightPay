'use client';

import { useSyncExternalStore } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import WalletCard from '@/components/WalletCard';
import ExchangeRateBanner from '@/components/ExchangeRateBanner';
import StatusBadge from '@/components/StatusBadge';
import { getCurrentMockUser } from '@/lib/mock/auth';
import { getUserTransactions } from '@/lib/mock/transactions';
import { getUserWallet, getCurrencyEquivalents } from '@/lib/mock/wallets';
import { formatCurrency, formatDate } from '@/lib/formatting';
import Link from 'next/link';

const subscribe = () => () => {};

export default function DashboardPage() {
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const user = getCurrentMockUser();
  const userWallet = getUserWallet(user);
  const currencyEquivalents = getCurrencyEquivalents(userWallet);
  const recentTransactions = isMounted ? getUserTransactions(user?.id).slice(0, 3) : [];

  return (
    <DashboardLayout user={user}>
      <ExchangeRateBanner />

      <div className="p-8 space-y-8">
        {/* Total Available Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-8 border border-slate-200 dark:border-slate-800 transition-colors">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-2">Total Available Balance</p>
          {isMounted ? (
            <>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(userWallet.balance, userWallet.currency)}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                Available funding balance in {userWallet.currency}
              </p>
            </>
          ) : (
            <div className="animate-pulse space-y-2 py-2">
              <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          )}
        </div>

        {/* Currency Equivalents Grid */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Currency Equivalents</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isMounted
                  ? `Estimated conversion value of your ${userWallet.currency} balance across supported currencies`
                  : 'Estimated conversion value across supported currencies'}
              </p>
            </div>
            <Link
              href="/dashboard/wallets"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isMounted
              ? currencyEquivalents.map((wallet) => (
                  <WalletCard key={wallet.id} wallet={wallet} />
                ))
              : Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse h-36"
                  />
                ))}
          </div>
        </div>

        {/* Quick Action */}
        <div className="bg-blue-50 dark:bg-blue-950/40 rounded-lg p-8 border border-blue-100 dark:border-blue-900/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Ready to send money?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Transfer funds to beneficiaries in your saved list
              </p>
            </div>
            <Link
              href="/dashboard/send-money"
              className="bg-blue-600 text-white font-medium px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Send Money
            </Link>
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Transactions</h2>
            <Link
              href="/dashboard/transactions"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-200">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-200">{tx.recipient}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(tx.amount, tx.currency)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <StatusBadge status={tx.status} />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">
                          {tx.reference}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                        {isMounted ? 'No recent transactions' : 'Loading transactions...'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
