'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/wallets', label: 'Wallets' },
  { href: '/dashboard/send-money', label: 'Send Money' },
  { href: '/dashboard/transactions', label: 'Transactions' },
  { href: '/dashboard/beneficiaries', label: 'Beneficiaries' },
  { href: '/dashboard/cards', label: 'Cards' },
  { href: '/dashboard/profile', label: 'Profile' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-colors duration-150 flex flex-col justify-between">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">WrightPay</h1>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
