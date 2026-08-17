'use client';

import { User } from '@/types';

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-slate-900 font-semibold">Welcome back, {user.name}</h2>
        <p className="text-sm text-slate-600">{user.email}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {user.name.charAt(0)}
          </span>
        </div>
      </div>
    </header>
  );
}
