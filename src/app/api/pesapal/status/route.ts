import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publicSupabase } from '@/lib/supabase/public';
import { getTransactionStatus, PESAPAL_PAID_STATUS } from '@/lib/pesapal';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await publicSupabase
      .from('profiles')
      .select('subscription_status, subscription_plan, pesapal_order_id')
      .eq('id', session.user.id)
      .single();

    if (profile?.subscription_status === 'paid') {
      return NextResponse.json({ is_paid: true, status: 'Completed' });
    }

    const orderTrackingId = profile?.pesapal_order_id;
    if (!orderTrackingId) {
      return NextResponse.json({ is_paid: false, status: 'no_order' });
    }

    const txStatus = await getTransactionStatus(orderTrackingId);
    const isPaid   = txStatus.payment_status_description === PESAPAL_PAID_STATUS;

    if (isPaid) {
      const { data: payment } = await publicSupabase
        .from('platform_payments')
        .select('amount_usd')
        .eq('pesapal_order_id', orderTrackingId)
        .single();

      const amount = payment?.amount_usd ?? 0;
      let plan: string;
      if (amount >= 70) {
        plan = 'pro';
      } else if (amount >= 25 && profile?.subscription_plan === 'starter') {
        plan = 'pro'; // Upgrade from Starter
      } else {
        plan = 'starter';
      }

      await Promise.all([
        publicSupabase
          .from('profiles')
          .update({ subscription_status: 'paid', subscription_plan: plan })
          .eq('id', session.user.id),

        publicSupabase
          .from('platform_payments')
          .update({
            status:              'completed',
            pesapal_tracking_id: txStatus.confirmation_code ?? orderTrackingId,
            confirmed_at:        new Date().toISOString(),
          })
          .eq('pesapal_order_id', orderTrackingId),
      ]);
    }

    return NextResponse.json({ is_paid: isPaid, status: txStatus.payment_status_description });
  } catch (err) {
    console.error('[pesapal/status]', err);
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
  }
}
