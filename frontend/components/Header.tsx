'use client';

import { useSyncExternalStore } from 'react';
import { User } from '@/types';
import { useAuth } from '@/lib/auth-context';

const subscribe = () => () => {};

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };


  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-4 flex items-center justify-between transition-colors duration-150">
      <div>
        <h2 className="text-slate-900 dark:text-slate-100 font-semibold">
          {isMounted ? `Welcome back, ${user?.name || 'User'}` : 'Welcome back'}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isMounted ? user?.email : ''}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
          <span className="text-white font-semibold text-sm">
            {isMounted && user?.name ? user.name.charAt(0) : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
