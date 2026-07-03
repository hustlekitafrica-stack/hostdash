import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

function calcDaysLeft(trialStart: string | null): number {
  if (!trialStart) return 14;
  const elapsed = (Date.now() - new Date(trialStart).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(14 - elapsed));
}

const TRIAL_DEFAULTS = {
  trial_start: null,
  subscription_status: 'trial',
  subscription_plan: null,
  whatsapp_phone: null,
  days_left: 14,
  is_expired: false,
  is_paid: false,
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('trial_start, subscription_status, subscription_plan, whatsapp_phone')
      .eq('id', user.id)
      .single();

    if (error) {
      console.warn('[subscription/GET] profile query error — returning trial defaults:', error.message);
      return NextResponse.json(TRIAL_DEFAULTS);
    }

    const daysLeft = calcDaysLeft(profile?.trial_start ?? null);
    const isPaid = profile?.subscription_status === 'paid';

    return NextResponse.json({
      trial_start: profile?.trial_start ?? null,
      subscription_status: profile?.subscription_status ?? 'trial',
      subscription_plan: profile?.subscription_plan ?? null,
      whatsapp_phone: profile?.whatsapp_phone ?? null,
      days_left: isPaid ? null : daysLeft,
      is_expired: !isPaid && daysLeft === 0,
      is_paid: isPaid,
    });
  } catch (err) {
    console.error('[subscription/GET]', err);
    return NextResponse.json(TRIAL_DEFAULTS);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.trial_start        !== undefined) updates.trial_start        = body.trial_start;
    if (body.subscription_status !== undefined) updates.subscription_status = body.subscription_status;
    if (body.subscription_plan   !== undefined) updates.subscription_plan   = body.subscription_plan;
    if (body.whatsapp_phone      !== undefined) updates.whatsapp_phone      = body.whatsapp_phone;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[subscription/PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
