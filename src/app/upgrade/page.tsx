'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const FEATURES = [
  { icon: '🏠', text: 'Unlimited property listings' },
  { icon: '📅', text: 'Full booking calendar & iCal sync' },
  { icon: '📊', text: 'Revenue reports & expense tracking' },
  { icon: '📱', text: 'Automated SMS & email notifications' },
  { icon: '🧾', text: 'Guest receipts & invoicing' },
  { icon: '⭐', text: 'Guest review management' },
  { icon: '🔔', text: 'Alerts, reminders & daily ops sheet' },
  { icon: '📡', text: 'Channel manager (Airbnb, Booking.com…)' },
  { icon: '🔒', text: 'Lifetime access — no recurring fees' },
];

const PAYMENT_METHODS = [
  { label: 'Visa',         color: '#1A1F71', bg: '#fff', text: 'VISA' },
  { label: 'Mastercard',   color: '#EB001B', bg: '#fff', text: 'MC' },
  { label: 'M-Pesa',       color: '#4CAF50', bg: '#fff', text: 'M-PESA' },
  { label: 'Airtel Money', color: '#E40000', bg: '#fff', text: 'AIRTEL' },
];

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth/login?next=/upgrade'); return; }
      setUserEmail(data.user.email ?? '');
      setCheckingAuth(false);
    });
  }, [router]);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pesapal/order', { method: 'POST' });
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm">HD</div>
          <span className="text-white font-bold text-base">HostDash</span>
        </div>
        <span className="text-slate-400 text-sm">{userEmail}</span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-sm font-medium">
              ✦ One-time payment · No subscription
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white text-center mb-4 leading-tight">
            Unlock <span className="text-teal-400">HostDash Pro</span>
          </h1>
          <p className="text-slate-400 text-center text-lg mb-12 max-w-xl mx-auto">
            Everything you need to manage your properties professionally — pay once, use forever.
          </p>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Feature list */}
            <div className="space-y-3">
              {FEATURES.map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center flex-shrink-0">{f.icon}</span>
                  <span className="text-slate-200 text-sm">{f.text}</span>
                </div>
              ))}
            </div>

            {/* Pricing card */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 shadow-2xl">
              {/* Price */}
              <div className="text-center mb-8">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-2">HostDash Pro</p>
                <div className="flex items-end justify-center gap-2 mb-1">
                  <span className="text-6xl font-extrabold text-white">$45</span>
                  <span className="text-slate-400 mb-3 text-lg">USD</span>
                </div>
                <p className="text-slate-500 text-sm">≈ KSh 6,000 · One-time · Lifetime access</p>
              </div>

              {/* Pay button */}
              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: loading ? '#0d6c62' : 'linear-gradient(135deg, #0f766e, #0ea5e9)' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Redirecting to PesaPal…
                  </span>
                ) : (
                  '💳 Pay with PesaPal →'
                )}
              </button>

              {/* Payment method badges */}
              <div className="flex gap-2 justify-center flex-wrap mt-5">
                {PAYMENT_METHODS.map(m => (
                  <span
                    key={m.label}
                    className="px-3 py-1 rounded-md text-xs font-bold border border-slate-600 bg-slate-700 text-slate-200"
                  >
                    {m.text}
                  </span>
                ))}
              </div>

              <p className="text-slate-500 text-xs text-center mt-5">
                Secured by PesaPal · 256-bit SSL encryption
              </p>

              <div className="mt-6 pt-6 border-t border-slate-700 text-center">
                <p className="text-slate-500 text-xs">
                  Already paid?{' '}
                  <a href="mailto:support@hostdash.app" className="text-teal-400 hover:underline">
                    Contact support
                  </a>
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="mt-2 text-slate-500 text-xs hover:text-slate-400 transition-colors"
                >
                  ← Back to dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
