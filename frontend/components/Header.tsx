'use client';

import { User } from '@/types';

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-4 flex items-center justify-between transition-colors duration-150">
      <div>
        <h2 className="text-slate-900 dark:text-slate-100 font-semibold">Welcome back, {user.name}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
          <span className="text-white font-semibold text-sm">
            {user.name.charAt(0)}
          </span>
        </div>
      </div>
    </header>
  );
}
