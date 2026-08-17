'use client';

import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { mockUser, mockTransactions } from '@/lib/mock-data';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { useState } from 'react';

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>(
    'all'
  );
  const [searchReference, setSearchReference] = useState('');

  const filteredTransactions = mockTransactions.filter((tx) => {
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchesSearch =
      searchReference === '' || tx.reference.toLowerCase().includes(searchReference.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout user={mockUser}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">View and manage all your transactions</p>
        </div>

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
                placeholder="WP-20240815-001"
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
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
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
                        {tx.exchangeRate.toFixed(4)}
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
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-600 dark:text-slate-400">
                      No transactions found
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
