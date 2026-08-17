import { Wallet } from '@/types';
import { formatCurrency } from '@/lib/formatting';

interface WalletCardProps {
  wallet: Wallet;
}

export default function WalletCard({ wallet }: WalletCardProps) {
  return (
    <div
      className={`rounded-lg p-6 transition-all duration-150 ${
        wallet.isDefault
          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm'
          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className={`text-sm font-medium ${wallet.isDefault ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>
            {wallet.isDefault ? 'Default Wallet' : 'Available'}
          </p>
          <p className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">
            {formatCurrency(wallet.balance, wallet.currency)}
          </p>
        </div>
        <div className={`text-2xl font-bold ${wallet.isDefault ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
          {wallet.currency}
        </div>
      </div>

      {wallet.isDefault && (
        <div className="pt-4 border-t border-blue-500">
          <p className="text-xs text-blue-100">Primary currency for transfers</p>
        </div>
      )}
    </div>
  );
}
