'use client';

import { useEffect, useState } from 'react';

interface SubscriptionData {
  is_paid: boolean;
  is_expired: boolean;
  days_left: number | null;
  subscription_status: string | null;
  subscription_plan: string | null;
}

interface SubscriptionState {
  isPro: boolean;
  isStarter: boolean;
  isTrial: boolean;
  isExpired: boolean;
  daysLeft: number;
  isLoaded: boolean;
}

const DEFAULT: SubscriptionState = {
  isPro:     false,
  isStarter: false,
  isTrial:   true,
  isExpired: false,
  daysLeft:  14,
  isLoaded:  false,
};

export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>(DEFAULT);

  useEffect(() => {
    fetch('/api/subscription')
      .then(r => r.ok ? r.json() : null)
      .then((d: SubscriptionData | null) => {
        if (!d) return;
        const isPaid = d.is_paid;
        const plan   = d.subscription_plan ?? '';

        const isPro     = isPaid && (plan === 'pro' || plan === 'lifetime');
        const isStarter = isPaid && plan === 'starter';
        const isTrial   = !isPaid && !d.is_expired;
        const isExpired = !isPaid && d.is_expired;

        setState({
          isPro,
          isStarter,
          isTrial,
          isExpired,
          daysLeft:  d.days_left ?? 0,
          isLoaded:  true,
        });
      })
      .catch(() => {
        setState(prev => ({ ...prev, isLoaded: true }));
      });
  }, []);

  return state;
}
