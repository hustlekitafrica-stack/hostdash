'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { useCurrency } from '@/lib/use-currency';

type Plan = 'starter' | 'pro';

const PLAN_CONFIG = {
  starter: { label: 'Starter', price: 45 },
  pro:     { label: 'Pro',     price: 70 },
} as const;

const FEATURES: { label: string; starter: boolean; pro: boolean; star?: boolean }[] = [
  { label: 'Booking calendar',              starter: true,  pro: true  },
  { label: 'Guest management',              starter: true,  pro: true  },
  { label: 'Expense tracking',              starter: true,  pro: true  },
  { label: 'SMS notifications',             starter: true,  pro: true  },
  { label: 'Receipt generation',            starter: true,  pro: true  },
  { label: 'Basic reports',                 starter: true,  pro: true  },
  { label: 'Unlimited property units',      starter: false, pro: true, star: true },
  { label: 'iCal sync (Airbnb, Booking.com)', starter: false, pro: true, star: true },
  { label: 'Unit performance analytics',    starter: false, pro: true, star: true },
  { label: 'Automated review requests',     starter: false, pro: true, star: true },
  { label: 'WhatsApp notifications',        starter: false, pro: true, star: true },
  { label: 'API access',                    starter: false, pro: true, star: true },
];

function Check({ on }: { on: boolean }) {
  return on
    ? <span className="text-teal-400 font-bold text-sm">✓</span>
    : <span className="text-slate-600 text-sm">—</span>;
}

export default function UpgradePage() {
  const router = useRouter();
  const [plan, setPlan]               = useState<Plan>('pro');
  const [loading, setLoading]         = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isStarter, setIsStarter]     = useState(false);
  const { formatLocal }                = useCurrency();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth/login?next=/upgrade'); return; }
      setCheckingAuth(false);
    });
    fetch('/api/subscription')
      .then(r => r.ok ? r.json() : null)
      .then((d: { subscription_status?: string; subscription_plan?: string } | null) => {
        if (d?.subscription_status === 'paid' && d?.subscription_plan === 'starter') {
          setIsStarter(true);
        }
      })
      .catch(() => {});
  }, [router]);

  const activePlan = isStarter ? 'pro-upgrade' : plan;
  const displayPrice = isStarter ? 25 : PLAN_CONFIG[plan].price;

  const handlePay = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/pesapal/order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: activePlan }),
      });
      const json = await res.json() as { redirect_url?: string; error?: string };
      if (!res.ok || json.error) {
        toast.error(json.error || 'Could not initiate payment. Try again.');
        return;
      }
      window.location.href = json.redirect_url!;
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f13]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400" />
      </div>
    );
  }

  const cfg = PLAN_CONFIG[plan];

  return (
    <div className="h-screen bg-[#0f0f13] flex flex-col overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-base"
        >
          ✕
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xs">HD</div>
          <span className="text-white font-bold text-base tracking-tight">HostDash</span>
        </div>
        <div className="w-9" />
      </header>

      <main className="flex-1 flex flex-col max-w-sm mx-auto w-full px-4 overflow-hidden">

        {/* Starter upgrade banner */}
        {isStarter && (
          <div className="mt-2 mb-2 px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-center flex-shrink-0">
            <p className="text-teal-300 text-xs font-semibold">
              ★ You\'re on Starter — upgrade to Pro for just <span className="text-white font-bold">$25 more</span>
            </p>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex bg-slate-800/80 rounded-xl p-1 mt-1 mb-3 flex-shrink-0">
          {(['starter', 'pro'] as Plan[]).map(p => (
            <button
              key={p}
              onClick={() => { if (!isStarter) setPlan(p); }}
              disabled={isStarter && p === 'starter'}
              title={isStarter && p === 'starter' ? 'Already purchased' : undefined}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                (isStarter ? 'pro' : plan) === p
                  ? 'bg-teal-600 text-white shadow-lg'
                  : isStarter && p === 'starter'
                  ? 'text-slate-600 cursor-not-allowed line-through'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {PLAN_CONFIG[p].label}{isStarter && p === 'starter' ? ' ✓' : ''}
            </button>
          ))}
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-2 gap-3 mb-3 flex-shrink-0">
          {(['starter', 'pro'] as Plan[]).map(p => {
            const c   = PLAN_CONFIG[p];
            const sel = plan === p;
            return (
              <div
                key={p}
                onClick={() => setPlan(p)}
                className={`relative rounded-2xl p-3 border-2 cursor-pointer transition-all duration-200 ${
                  sel ? 'border-teal-500 bg-slate-800' : 'border-slate-700/60 bg-slate-800/30'
                }`}
              >
                {p === 'pro' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-teal-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                    {isStarter ? 'YOUR UPGRADE' : 'BEST VALUE'}
                  </div>
                )}
                {isStarter && p === 'starter' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-600 text-slate-300 text-[10px] font-bold px-3 py-0.5 rounded-full">
                    PURCHASED
                  </div>
                )}
                <p className="text-slate-500 text-[11px] uppercase tracking-wide mt-1">Lifetime</p>
                {isStarter && p === 'pro' ? (
                  <>
                    <p className="text-slate-500 text-[11px] line-through">${c.price}</p>
                    <p className="text-white text-[2rem] font-extrabold leading-tight">$25</p>
                    {formatLocal(25) && <p className="text-teal-400 text-[11px] font-semibold">{formatLocal(25)}</p>}
                    <p className="text-teal-400 text-[11px] font-semibold">You paid $45 ✓</p>
                  </>
                ) : (
                  <>
                    <p className="text-white text-[2rem] font-extrabold leading-tight">${c.price}</p>
                    {formatLocal(c.price) && (
                      <p className="text-slate-500 text-[11px]">{formatLocal(c.price)}</p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <div className="flex-1 min-h-0 mb-3 rounded-2xl bg-slate-800/30 border border-slate-800 overflow-hidden flex flex-col">
          <div className="flex items-center justify-end gap-0 px-4 py-2 border-b border-slate-800 bg-slate-800/60 flex-shrink-0">
            <span className="text-slate-400 text-xs font-semibold flex-1">Feature</span>
            <span className={`text-xs font-bold w-14 text-center ${
              plan === 'starter' ? 'text-teal-400' : 'text-slate-500'
            }`}>Starter</span>
            <span className={`text-xs font-bold w-12 text-center ${
              plan === 'pro' ? 'text-teal-400' : 'text-slate-500'
            }`}>Pro</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className={`flex items-center px-4 py-2 gap-2 ${
                  i < FEATURES.length - 1 ? 'border-b border-slate-800/60' : ''
                } ${f.star ? 'bg-teal-950/20' : ''}`}
              >
                {f.star
                  ? <span className="text-teal-500 text-[10px] flex-shrink-0">★</span>
                  : <span className="w-[10px] flex-shrink-0" />}
                <span className={`flex-1 text-xs ${
                  f.star ? 'text-slate-200 font-medium' : 'text-slate-400'
                }`}>{f.label}</span>
                <span className="w-14 flex justify-center"><Check on={f.starter} /></span>
                <span className="w-12 flex justify-center"><Check on={f.pro} /></span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA section */}
        <div className="flex-shrink-0 space-y-2">
          {isStarter ? (
            <p className="text-slate-400 text-xs text-center">
              Pay the <span className="text-white font-semibold">$25 difference</span> to unlock all Pro features
            </p>
          ) : (
            <p className="text-slate-400 text-xs text-center">
              14-day free trial, then{' '}
              <span className="text-white font-semibold">${displayPrice} one-time</span>
            </p>
          )}

          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
            style={{ background: loading ? '#0d6c62' : 'linear-gradient(135deg, #0f766e, #0ea5e9)' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e  => { e.currentTarget.style.filter = 'none'; }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Redirecting to PesaPal…
              </span>
            ) : isStarter ? (
              'Upgrade to Pro — $25 →'
            ) : (
              `Get ${cfg.label} — $${cfg.price} →`
            )}
          </button>

          <div className="flex gap-2 justify-center flex-wrap">
            {['VISA', 'MC', 'M-PESA', 'AIRTEL'].map(m => (
              <span key={m} className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-700 bg-slate-800 text-slate-300">
                {m}
              </span>
            ))}
          </div>

          <p className="text-slate-600 text-[10px] text-center">
            Secured by PesaPal · 256-bit SSL · No recurring fees
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-slate-600 text-[10px] hover:text-slate-400 transition-colors"
            >
              Back to dashboard
            </button>
            <span className="text-slate-700">·</span>
            <a href="mailto:support@hostdash.app" className="text-slate-600 text-[10px] hover:text-slate-400 transition-colors">
              Contact support
            </a>
          </div>
        </div>

      </main>
    </div>
  );
}
