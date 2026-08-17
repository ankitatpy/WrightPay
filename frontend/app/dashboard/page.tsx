'use client';

import DashboardLayout from '@/components/DashboardLayout';
import WalletCard from '@/components/WalletCard';
import ExchangeRateBanner from '@/components/ExchangeRateBanner';
import StatusBadge from '@/components/StatusBadge';
import { mockUser, mockWallets, mockTransactions } from '@/lib/mock-data';
import { formatCurrency, formatDate } from '@/lib/formatting';
import Link from 'next/link';

export default function DashboardPage() {
  const totalBalance = mockWallets.reduce(
    (sum, wallet) => sum + (wallet.currency === 'EUR' ? wallet.balance : wallet.balance * 0.92),
    0
  );
  const defaultWallet = mockWallets.find((w) => w.isDefault);
  const recentTransactions = mockTransactions.slice(0, 3);

  return (
    <DashboardLayout user={mockUser}>
      <ExchangeRateBanner />

      <div className="p-8 space-y-8">
        {/* Total Balance */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <p className="text-slate-600 text-sm font-medium mb-2">Total Balance</p>
          <h1 className="text-4xl font-bold text-slate-900">
            {formatCurrency(totalBalance, 'EUR')}
          </h1>
          <p className="text-slate-600 text-sm mt-2">Across all wallets in EUR equivalent</p>
        </div>

        {/* Wallets Grid */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Your Wallets</h2>
            <Link
              href="/dashboard/wallets"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockWallets.map((wallet) => (
              <WalletCard key={wallet.id} wallet={wallet} />
            ))}
          </div>
        </div>

        {/* Quick Action */}
        <div className="bg-blue-50 rounded-lg p-8 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Ready to send money?</h3>
              <p className="text-slate-600 text-sm">
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
            <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
            <Link
              href="/dashboard/transactions"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">{tx.recipient}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                        {tx.reference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
