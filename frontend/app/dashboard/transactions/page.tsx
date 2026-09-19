'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import { getTransactions } from '@/lib/api/transactions';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { Transaction, TransactionStatus } from '@/types';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>(
    'all'
  );
  const [searchReference, setSearchReference] = useState('');

  const fetchTransactions = (status: typeof statusFilter, ref: string) => {
    setIsLoading(true);
    setError(null);

    const statusParam =
      status === 'all' ? undefined : (status.toUpperCase() as TransactionStatus);
    const refParam = ref.trim() || undefined;

    getTransactions({
      status: statusParam,
      reference: refParam,
    })
      .then((data) => {
        setTransactions(data.items);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load transactions';
        setError(message);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    const timer = setTimeout(() => {
      const statusParam =
        statusFilter === 'all' ? undefined : (statusFilter.toUpperCase() as TransactionStatus);
      const refParam = searchReference.trim() || undefined;

      getTransactions({
        status: statusParam,
        reference: refParam,
      })
        .then((data) => {
          if (!isCancelled) {
            setTransactions(data.items);
            setIsLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!isCancelled) {
            const message = err instanceof Error ? err.message : 'Failed to load transactions';
            setError(message);
            setIsLoading(false);
          }
        });
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [user, statusFilter, searchReference]);

  return (
    <DashboardLayout user={user}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">View and manage all your transactions</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchTransactions(statusFilter, searchReference)}
              className="text-xs font-semibold px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-6 mb-6 border border-slate-200 dark:border-slate-800 transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">
                Filter by status
              </label>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'completed', 'pending', 'failed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">
                Search by reference
              </label>
              <input
                type="text"
                placeholder="WP-20260816-001"
                value={searchReference}
                onChange={(e) => setSearchReference(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
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
                    Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                    Exchange Rate
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
                {!isLoading && transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-200">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-200">{tx.recipient}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-200">
                        {formatCurrency(tx.fee, tx.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-200 font-mono">
                        {tx.exchangeRate ? tx.exchangeRate.toFixed(4) : '1.0000'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">
                        {tx.reference}
                      </td>
                    </tr>
                  ))
                ) : !isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-600 dark:text-slate-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      <div className="animate-pulse flex justify-center py-4">
                        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

