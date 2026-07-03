'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SubStatus {
  is_paid: boolean;
  is_expired: boolean;
  days_left: number | null;
}

const DEFAULT: SubStatus = { is_paid: false, is_expired: false, days_left: 14 };

export function TrialBanner() {
  const router = useRouter();
  const [status, setStatus] = useState<SubStatus>(DEFAULT);
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

  const marginClass = collapsed ? 'lg:ml-20' : 'lg:ml-64';

  return (
    <div className={`${marginClass} flex justify-end px-4 py-1.5 transition-all duration-300 flex-shrink-0`}>
      <button
        onClick={() => router.push('/upgrade')}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-teal-500/40 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 text-xs font-semibold transition-colors"
      >
        ⚡ Upgrade to Pro
      </button>
    </div>
  );
}
