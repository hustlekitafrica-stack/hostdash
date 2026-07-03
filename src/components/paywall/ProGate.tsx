'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useSubscription } from '@/lib/use-subscription';
import { useCurrency } from '@/lib/use-currency';

interface ProGateProps {
  feature: string;
  children: ReactNode;
}

export function ProGate({ feature, children }: ProGateProps) {
  const router = useRouter();
  const { isPro, isStarter, isLoaded } = useSubscription();
  const { formatLocal } = useCurrency();

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400" />
      </div>
    );
  }

  if (isPro) return <>{children}</>;

  return (
    <div className="relative min-h-[400px] flex flex-col">
      {/* Blurred background preview */}
      <div className="pointer-events-none select-none" aria-hidden>
        <div className="blur-sm opacity-40 saturate-50">
          {children}
        </div>
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-[#0f0f13]/90 backdrop-blur-sm border border-slate-700 rounded-2xl px-8 py-10 text-center max-w-sm mx-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-teal-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-2">Pro Feature</p>
          <h3 className="text-white text-lg font-bold mb-2">{feature}</h3>
          {isStarter ? (
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              You\'re on <span className="text-white font-semibold">Starter</span>. Pay just{' '}
              <span className="text-teal-300 font-bold">$25 more</span> to unlock Pro features — lifetime access.
            </p>
          ) : (
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Upgrade to <span className="text-white font-semibold">HostDash Pro</span> to unlock {feature} and all other advanced features.
            </p>
          )}

          <button
            onClick={() => router.push('/upgrade')}
            className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all duration-200 hover:brightness-110 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0f766e, #0ea5e9)' }}
          >
            {isStarter ? '⚡ Upgrade to Pro — $25' : '⚡ Upgrade to Pro — $70'}
          </button>
          {(() => { const loc = formatLocal(isStarter ? 25 : 70); return loc ? <p className="mt-1.5 text-slate-500 text-[11px]">{loc}</p> : null; })()}

          <button
            onClick={() => router.push('/upgrade')}
            className="mt-3 text-slate-500 text-xs hover:text-slate-400 transition-colors"
          >
            View all plans →
          </button>
        </div>
      </div>
    </div>
  );
}
