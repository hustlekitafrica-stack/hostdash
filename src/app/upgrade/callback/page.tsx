'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Phase = 'checking' | 'success' | 'pending' | 'error';

export default function UpgradeCallbackPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const MAX_ATTEMPTS = 10;
    const INTERVAL_MS  = 2000;

    const poll = async () => {
      try {
        const res  = await fetch('/api/pesapal/status');
        const json = await res.json() as { is_paid?: boolean; status?: string; error?: string };

        if (cancelled) return;

        if (json.is_paid) {
          setPhase('success');
          toast.success('Payment confirmed! Welcome to HostDash Pro 🎉');
          setTimeout(() => router.push('/dashboard'), 2500);
          return;
        }

        const next = attempts + 1;
        setAttempts(next);

        if (next >= MAX_ATTEMPTS) {
          setPhase('pending');
          return;
        }

        setTimeout(poll, INTERVAL_MS);
      } catch {
        if (!cancelled) setPhase('error');
      }
    };

    setTimeout(poll, 1500);
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center max-w-sm w-full">

        {phase === 'checking' && (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-teal-500/30 border-t-teal-400 animate-spin mx-auto mb-6" />
            <h2 className="text-white text-xl font-bold mb-2">Confirming your payment…</h2>
            <p className="text-slate-400 text-sm">This usually takes a few seconds. Please wait.</p>
          </>
        )}

        {phase === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6 text-4xl">
              🎉
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Payment Confirmed!</h2>
            <p className="text-slate-400 text-sm mb-4">Welcome to HostDash Pro. Redirecting you now…</p>
            <div className="w-full bg-slate-700 rounded-full h-1">
              <div className="h-1 rounded-full bg-teal-400 animate-[grow_2.5s_linear_forwards]" style={{ width: '100%', transformOrigin: 'left', animation: 'none', transition: 'width 2.5s linear' }} />
            </div>
          </>
        )}

        {phase === 'pending' && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6 text-4xl">
              ⏳
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Payment processing…</h2>
            <p className="text-slate-400 text-sm mb-6">
              Your payment is being confirmed by PesaPal. This can take a few minutes.
              Your account will be unlocked automatically once confirmed.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setPhase('checking'); setAttempts(0); }}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #0f766e, #0ea5e9)' }}
              >
                Check again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-slate-400 text-sm hover:text-slate-300 transition-colors"
              >
                Go to dashboard →
              </button>
            </div>
          </>
        )}

        {phase === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6 text-4xl">
              ⚠️
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-6">
              We could not verify your payment status. If you completed the payment, contact support.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setPhase('checking'); setAttempts(0); }}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #0f766e, #0ea5e9)' }}
              >
                Retry
              </button>
              <a
                href="mailto:support@hostdash.app"
                className="text-teal-400 text-sm hover:underline"
              >
                Contact support
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
