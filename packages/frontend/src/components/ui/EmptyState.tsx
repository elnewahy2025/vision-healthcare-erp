import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title = 'No data', message = 'Nothing to show yet.', action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-[var(--surface-hover)] rounded-full flex items-center justify-center mb-4 dark:bg-gray-800">
        {icon || <Inbox className="w-8 h-8 text-[var(--text-disabled)]" />}
      </div>
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1 dark:text-gray-100">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-sm dark:text-[var(--text-disabled)]">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
