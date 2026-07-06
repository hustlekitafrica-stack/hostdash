/**
 * Plan-based limits and helpers.
 *
 * Starter plan: max 20 properties.
 * Pro plan:     unlimited.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export const STARTER_PROPERTY_LIMIT = 20;

interface PlanCheckResult {
  allowed: boolean;
  plan: string | null;
  current: number;
  limit: number | null;
}

/**
 * Check whether a user can create another property based on their plan.
 * Returns { allowed, plan, current, limit }.
 */
export async function canCreateProperty(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanCheckResult> {
  const [profileRes, countRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('subscription_plan, subscription_status')
      .eq('id', userId)
      .single(),
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const plan = profileRes.data?.subscription_plan ?? null;
  const isPro =
    profileRes.data?.subscription_status === 'paid' && plan === 'pro';
  const current = countRes.count ?? 0;

  if (isPro) {
    return { allowed: true, plan, current, limit: null };
  }

  return {
    allowed: current < STARTER_PROPERTY_LIMIT,
    plan,
    current,
    limit: STARTER_PROPERTY_LIMIT,
  };
}
