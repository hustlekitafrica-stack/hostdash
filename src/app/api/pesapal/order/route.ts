import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publicSupabase } from '@/lib/supabase/public';
import { submitOrder } from '@/lib/pesapal';

const PLAN_AMOUNTS: Record<string, number> = { starter: 45, pro: 70, 'pro-upgrade': 25 };
const CURRENCY = 'USD';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { plan?: string };
  const plan = (['starter', 'pro', 'pro-upgrade'] as string[]).includes(body.plan ?? '')
    ? (body.plan as string)
    : 'pro';
  const AMOUNT_USD = PLAN_AMOUNTS[plan];
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = session.user;

    const { data: profile } = await publicSupabase
      .from('profiles')
      .select('subscription_status, subscription_plan, full_name, email')
      .eq('id', user.id)
      .single();

    if (plan === 'pro-upgrade') {
      const isStarter = profile?.subscription_status === 'paid' && profile?.subscription_plan === 'starter';
      if (!isStarter) {
        return NextResponse.json({ error: 'Pro upgrade is only available for Starter subscribers' }, { status: 400 });
      }
    } else if (profile?.subscription_status === 'paid') {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 });
    }

    const orderId = `HD-${user.id.slice(0, 8)}-${Date.now()}`;
    const email   = profile?.email || user.email || '';
    const nameParts = (profile?.full_name || email.split('@')[0]).split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName  = nameParts.slice(1).join(' ') || 'HostDash';

    const result = await submitOrder({
      orderId,
      amount:       AMOUNT_USD,
      currency:     CURRENCY,
      description:  plan === 'pro'         ? 'HostDash Pro — Lifetime Access'
                  : plan === 'pro-upgrade' ? 'HostDash Pro Upgrade — Lifetime Access'
                  :                         'HostDash Starter — Lifetime Access',
      firstName,
      lastName,
      emailAddress: email,
    });

    await publicSupabase
      .from('profiles')
      .update({ pesapal_order_id: result.order_tracking_id })
      .eq('id', user.id);

    await publicSupabase
      .from('platform_payments')
      .insert({
        user_id:          user.id,
        pesapal_order_id: result.order_tracking_id,
        amount_usd:       AMOUNT_USD,
        currency:         CURRENCY,
        status:           'pending',
      });

    return NextResponse.json({ redirect_url: result.redirect_url });
  } catch (err) {
    console.error('[pesapal/order]', err);
    const msg = err instanceof Error ? err.message : 'Payment initiation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
