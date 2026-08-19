import { TransactionStatus } from '@/types';

interface StatusBadgeProps {
  status: TransactionStatus | 'completed' | 'pending' | 'failed' | 'processing' | 'suspicious';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status || 'pending').toLowerCase();

  const statusStyles: Record<string, string> = {
    completed:
      'bg-green-100 text-green-800 dark:bg-green-950/70 dark:text-green-300 dark:border dark:border-green-800/50',
    processing:
      'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 dark:border dark:border-blue-800/50',
    pending:
      'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 dark:border dark:border-amber-800/50',
    failed:
      'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 dark:border dark:border-red-800/50',
    suspicious:
      'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 dark:border dark:border-purple-800/50',
  };

  const statusLabels: Record<string, string> = {
    completed: 'Completed',
    processing: 'Processing',
    pending: 'Pending',
    failed: 'Failed',
    suspicious: 'Suspicious',
  };

  const style = statusStyles[normalized] || statusStyles.pending;
  const label = statusLabels[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
