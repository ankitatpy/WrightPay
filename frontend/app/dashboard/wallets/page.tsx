'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import WalletCard from '@/components/WalletCard';
import { useAuth } from '@/lib/auth-context';
import { getMyWallet, transformWalletEquivalents } from '@/lib/api/wallets';
import { WalletResponse } from '@/types';

export default function WalletsPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(true);
  const [walletError, setWalletError] = useState<string | null>(null);

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
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Your Wallets</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage your multi-currency wallets. The default wallet is used for automatic conversions.
          </p>
        </div>

        {/* Error Banner */}
        {walletError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
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


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!isLoadingWallet && wallet
            ? currencyEquivalents.map((item) => (
                <div key={item.id}>
                  <WalletCard wallet={item} />
                </div>
              ))
            : Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse h-36"
                />
              ))}
        </div>


        {/* Placeholder for future features */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-950/40 rounded-lg p-8 border border-blue-100 dark:border-blue-900/50 transition-colors">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Coming Soon</h3>
          <ul className="text-slate-600 dark:text-slate-400 text-sm space-y-2">
            <li>• Add new wallets in additional currencies</li>
            <li>• Set default currency for transactions</li>
            <li>• View detailed wallet transaction history</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
