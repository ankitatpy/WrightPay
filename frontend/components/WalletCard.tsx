import { Wallet } from '@/types';
import { formatCurrency } from '@/lib/formatting';

interface WalletCardProps {
  wallet: Wallet;
}

export default function WalletCard({ wallet }: WalletCardProps) {
  return (
    <div
      className={`rounded-lg p-6 ${
        wallet.isDefault
          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
          : 'bg-white border border-slate-200 text-slate-900'
      }`}
    >
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className={`text-sm font-medium ${wallet.isDefault ? 'text-blue-100' : 'text-slate-600'}`}>
            {wallet.isDefault ? 'Default Wallet' : 'Available'}
          </p>
          <p className="text-3xl font-bold mt-2">
            {formatCurrency(wallet.balance, wallet.currency)}
          </p>
        </div>
        <div className={`text-2xl font-bold ${wallet.isDefault ? 'text-blue-100' : 'text-slate-400'}`}>
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
