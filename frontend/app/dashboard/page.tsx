'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import WalletCard from '@/components/WalletCard';
import ExchangeRateBanner from '@/components/ExchangeRateBanner';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import { getTransactions } from '@/lib/api/transactions';
import { getMyWallet, transformWalletEquivalents } from '@/lib/api/wallets';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { WalletResponse, Transaction } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    getMyWallet()
      .then((data) => {
        if (!isCancelled) {
          setWallet(data);
          setWalletError(null);
          setIsLoadingWallet(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load wallet data.';
          setWalletError(message);
          setIsLoadingWallet(false);
        }
      });

    getTransactions({ limit: 3 })
      .then((res) => {
        if (!isCancelled) {
          setRecentTransactions(res.items);
          setIsLoadingTransactions(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load recent transactions:', err);
        if (!isCancelled) {
          setIsLoadingTransactions(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const handleRetry = () => {
    setIsLoadingWallet(true);
    setWalletError(null);
    getMyWallet()
      .then((data) => {
        setWallet(data);
        setIsLoadingWallet(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load wallet data.';
        setWalletError(message);
        setIsLoadingWallet(false);
      });
  };

  const currencyEquivalents = wallet ? transformWalletEquivalents(wallet) : [];



  return (
    <DashboardLayout user={user}>
      <ExchangeRateBanner />

      <div className="p-8 space-y-8">
        {/* Wallet Error Banner */}
        {walletError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{walletError}</span>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="text-xs font-semibold px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors cursor-pointer"
            >
              Retry
            </button>

          </div>
        )}

        {/* Total Available Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-8 border border-slate-200 dark:border-slate-800 transition-colors">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-2">Total Available Balance</p>
          {!isLoadingWallet && wallet ? (
            <>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(wallet.balance, wallet.currency)}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                Available funding balance in {wallet.currency}
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
                {!isLoadingWallet && wallet
                  ? `Estimated conversion value of your ${wallet.currency} balance across supported currencies`
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
            {!isLoadingWallet && wallet
              ? currencyEquivalents.map((item) => (
                  <WalletCard key={item.id} wallet={item} />
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
                        {isLoadingTransactions ? 'Loading transactions...' : 'No recent transactions'}
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
