'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface MobileHeaderProps {
  onMenuOpen: () => void;
  onAddBooking: () => void;
  onAdjustPricing: () => void;
  onBlockDates: () => void;
  onMessageGuest: () => void;
  onGenerateReport: () => void;
}

export function MobileHeader({ 
  onMenuOpen, 
  onAddBooking, 
  onAdjustPricing, 
  onBlockDates, 
  onMessageGuest, 
  onGenerateReport 
}: MobileHeaderProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    fetch('/api/subscription')
      .then(r => r.ok ? r.json() : null)
      .then((d: { is_paid?: boolean } | null) => { if (d?.is_paid) setIsPaid(true); })
      .catch(() => {});
  }, []);

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/properties') return 'Properties';
    if (pathname === '/unit-performance') return 'Performance';
    if (pathname === '/calendar') return 'Calendar';
    if (pathname === '/guests') return 'Guests';
    if (pathname === '/alerts') return 'Alerts';
    if (pathname === '/expenses') return 'Expenses';
    if (pathname === '/reports') return 'Reports';
    if (pathname === '/settings') return 'Settings';
    return 'HostDash';
  };

  // Hide header on pages that have their own sticky header
  const pagesWithOwnHeader = ['/booking-calendar', '/alerts', '/guests', '/unit-performance', '/properties', '/expenses', '/reports', '/settings', '/help', '/requests', '/unit-types'];
  if (pagesWithOwnHeader.includes(pathname)) {
    return null;
  }

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30">
      {/* Header Row */}
      <div className="flex items-center justify-between px-4 h-[80px]">
        {/* Burger Menu */}
        <button
          onClick={onMenuOpen}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
          title="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo */}
        <h1 className="text-base font-bold text-gray-900">HostDash</h1>

        {/* Upgrade button — hidden once paid */}
        {isPaid ? (
          <div className="w-10" />
        ) : (
          <button
            onClick={() => router.push('/upgrade')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-teal-500/50 bg-teal-50 text-teal-600 hover:bg-teal-100 text-[11px] font-semibold transition-colors"
          >
            ⚡ Upgrade
          </button>
        )}
      </div>

    </div>
  );
}
