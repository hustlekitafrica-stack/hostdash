'use client';

import { useEffect, useState } from 'react';

interface CurrencyState {
  formatLocal: (usdAmount: number) => string | null;
  ready: boolean;
}

const CACHE_KEY = 'hd_currency_v1';

function loadCache(): { code: string; rate: number } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCache(code: string, rate: number) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ code, rate }));
  } catch { /* ignore */ }
}

function fmt(usdAmount: number, code: string, rate: number): string | null {
  if (code === 'USD') return null;
  const local = Math.round(usdAmount * rate);
  try {
    return '≈ ' + new Intl.NumberFormat(undefined, {
      style:                 'currency',
      currency:              code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(local);
  } catch {
    return `≈ ${code} ${local.toLocaleString()}`;
  }
}

export function useCurrency(): CurrencyState {
  const [state, setState] = useState<{ code: string; rate: number } | null>(null);
  const [ready, setReady]  = useState(false);

  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setState(cached);
      setReady(true);
      return;
    }

    (async () => {
      try {
        const geo  = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
        const geoJ = await geo.json() as { currency?: string };
        const code = geoJ.currency ?? 'USD';

        if (code === 'USD') {
          saveCache('USD', 1);
          setState({ code: 'USD', rate: 1 });
          setReady(true);
          return;
        }

        const fx   = await fetch(`https://open.er-api.com/v6/latest/USD`, { signal: AbortSignal.timeout(4000) });
        const fxJ  = await fx.json() as { rates?: Record<string, number> };
        const rate = fxJ.rates?.[code] ?? null;

        if (!rate) {
          setReady(true);
          return;
        }

        saveCache(code, rate);
        setState({ code, rate });
      } catch {
        /* silent fallback — no conversion shown */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  return {
    formatLocal: state ? (usd) => fmt(usd, state.code, state.rate) : () => null,
    ready,
  };
}
