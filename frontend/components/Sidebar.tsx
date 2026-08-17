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
    <aside className="w-64 border-r border-slate-200 bg-white p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">WrightPay</h1>
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
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
