'use client';

import DashboardLayout from '@/components/DashboardLayout';
import WalletCard from '@/components/WalletCard';
import { mockUser, mockWallets } from '@/lib/mock-data';

export default function WalletsPage() {
  return (
    <DashboardLayout user={mockUser}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Your Wallets</h1>
          <p className="text-slate-600 mt-2">
            Manage your multi-currency wallets. The default wallet is used for automatic conversions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockWallets.map((wallet) => (
            <div key={wallet.id}>
              <WalletCard wallet={wallet} />
            </div>
          ))}
        </div>

        {/* Placeholder for future features */}
        <div className="mt-12 bg-blue-50 rounded-lg p-8 border border-blue-100">
          <h3 className="font-semibold text-slate-900 mb-2">Coming Soon</h3>
          <ul className="text-slate-600 text-sm space-y-2">
            <li>• Add new wallets in additional currencies</li>
            <li>• Set default currency for transactions</li>
            <li>• View detailed wallet transaction history</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
