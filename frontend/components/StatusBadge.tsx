interface StatusBadgeProps {
  status: 'completed' | 'pending' | 'failed';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyles = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-950/70 dark:text-green-300 dark:border dark:border-green-800/50',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 dark:border dark:border-amber-800/50',
    failed: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 dark:border dark:border-red-800/50',
  };

  const statusLabels = {
    completed: 'Completed',
    pending: 'Pending',
    failed: 'Failed',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
