'use client';

import { useRouter } from 'next/navigation';
import { useSubscription } from '@/lib/use-subscription';
import { useCurrency } from '@/lib/use-currency';

export function SidebarUpgradeWidget({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { isPro, isStarter, daysLeft, isExpired, isLoaded } = useSubscription();
  const { formatLocal } = useCurrency();

  if (!isLoaded) return null;

  /* ── COLLAPSED ── */
  if (collapsed) {
    if (isPro) {
      return (
        <div className="flex justify-center py-1">
          <span title="Pro Active" className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-600/20 text-teal-400 text-sm font-bold">✓</span>
        </div>
      );
    }
    if (isStarter) {
      return (
        <div className="flex justify-center py-1">
          <button onClick={() => router.push('/upgrade')} title="Upgrade to Pro — $25"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 transition-colors text-sm font-bold">
            ↑
          </button>
        </div>
      );
    }
    return (
      <div className="flex justify-center py-1">
        <button onClick={() => router.push('/upgrade')} title="Upgrade to Pro"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-colors text-sm">
          ⚡
        </button>
      </div>
    );
  }

  /* ── PRO ACTIVE ── */
  if (isPro) {
    return (
      <div className="mx-2 px-3 py-2.5 rounded-xl bg-teal-600/15 border border-teal-600/30 flex items-center gap-2">
        <span className="text-teal-400 text-sm">✓</span>
        <span className="text-teal-300 text-xs font-semibold">Pro Active</span>
      </div>
    );
  }

  /* ── STARTER — show $25 upgrade card ── */
  if (isStarter) {
    const local25 = formatLocal(25);
    return (
      <div className="mx-2 px-3 py-3 rounded-xl bg-teal-900/30 border border-teal-700/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-teal-300 text-xs font-semibold">On Starter</span>
          <span className="text-teal-500 text-[10px]">$45 paid ✓</span>
        </div>
        <button
          onClick={() => router.push('/upgrade')}
          className="w-full py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #0f766e, #0ea5e9)' }}
        >
          ↑ Upgrade to Pro — $25
        </button>
        {local25 && <p className="text-teal-500 text-[10px] text-center">{local25}</p>}
      </div>
    );
  }

  /* ── TRIAL / EXPIRED ── */
  const pct       = isExpired ? 0 : Math.min(100, Math.round((daysLeft / 14) * 100));
  const barColor  = isExpired ? 'bg-red-500'  : daysLeft <= 4 ? 'bg-amber-400' : 'bg-teal-500';
  const textColor = isExpired ? 'text-red-400' : daysLeft <= 4 ? 'text-amber-400' : 'text-slate-300';
  const label     = isExpired ? 'Trial expired' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`;

  return (
    <div className="mx-2 px-3 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${textColor}`}>{label}</span>
        <span className="text-slate-500 text-[10px]">Free trial</span>
      </div>
      <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <button
        onClick={() => router.push('/upgrade')}
        className="w-full py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:brightness-110"
        style={{ background: 'linear-gradient(135deg, #0f766e, #0ea5e9)' }}
      >
        ⚡ Upgrade to Pro
      </button>
    </div>
  );
}
