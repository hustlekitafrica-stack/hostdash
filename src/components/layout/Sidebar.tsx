'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
  },
  {
    label: 'Properties',
    href: '/properties',
    icon: '🏠',
  },
  {
    label: 'Calendar',
    href: '/calendar',
    icon: '📅',
  },
  {
    label: 'Bookings',
    href: '/bookings',
    icon: '🔑',
  },
  {
    label: 'Guests',
    href: '/guests',
    icon: '👥',
  },
  {
    label: 'Expenses',
    href: '/expenses',
    icon: '💰',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: '📈',
  },
  {
    label: 'Alerts',
    href: '/alerts',
    icon: '🔔',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: '⚙️',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-surface-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-surface-800">
        <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-lg">
          HD
        </div>
        <div>
          <h1 className="font-bold text-lg">HostDash</h1>
          <p className="text-xs text-surface-400">Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-surface-300 hover:bg-surface-800'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-surface-800 p-4">
        <p className="text-xs text-surface-400 text-center">
          © 2025 HostDash
        </p>
      </div>
    </aside>
  );
}
