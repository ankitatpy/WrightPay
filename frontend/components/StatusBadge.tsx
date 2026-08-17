interface StatusBadgeProps {
  status: 'completed' | 'pending' | 'failed';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyles = {
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    failed: 'bg-red-100 text-red-800',
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
