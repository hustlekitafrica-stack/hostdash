'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SubStatus {
  is_paid: boolean;
  is_expired: boolean;
  days_left: number | null;
}

const DEFAULT_STATUS: SubStatus = { is_paid: false, is_expired: false, days_left: 14 };

export function TrialBanner() {
  const router = useRouter();
  const [status, setStatus] = useState<SubStatus>(DEFAULT_STATUS);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/subscription')
      .then(r => r.ok ? r.json() : null)
      .then((d: SubStatus | null) => { if (d) setStatus(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: Event) => setCollapsed((e as CustomEvent).detail.collapsed);
    window.addEventListener('sidebarToggle', handler);
    return () => window.removeEventListener('sidebarToggle', handler);
  }, []);

  if (status.is_paid) return null;

  const isExpired = status.is_expired;
  const daysLeft  = status.days_left ?? 0;

  const bgClass    = isExpired ? 'bg-red-600'   : 'bg-amber-500';
  const textColor  = 'text-white';

  const message = isExpired
    ? 'Your free trial has expired.'
    : daysLeft === 1
      ? 'Last day of your free trial!'
      : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in your free trial.`;

  const marginClass = collapsed ? 'lg:ml-20' : 'lg:ml-64';

  return (
    <div className={`${bgClass} ${textColor} ${marginClass} sticky top-[80px] lg:top-0 z-20 px-4 py-2 flex items-center justify-between gap-4 text-sm flex-shrink-0 transition-all duration-300`}>
      <span className="font-medium">{message}</span>
      <button
        onClick={() => router.push('/upgrade')}
        className="flex-shrink-0 px-4 py-1 rounded-full bg-white font-semibold text-sm transition-opacity hover:opacity-90"
        style={{ color: isExpired ? '#dc2626' : '#d97706' }}
      >
        Upgrade — $45 →
      </button>
    </div>
  );
}
