import { NextRequest, NextResponse } from 'next/server';
import { publicSupabase } from '@/lib/supabase/public';
import { getTransactionStatus, PESAPAL_PAID_STATUS } from '@/lib/pesapal';

export async function GET(request: NextRequest) {
  return handleIPN(request);
}

export async function POST(request: NextRequest) {
  return handleIPN(request);
}

async function handleIPN(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderTrackingId  = searchParams.get('OrderTrackingId') || searchParams.get('orderTrackingId');
    const orderMerchantRef = searchParams.get('OrderMerchantReference') || searchParams.get('orderMerchantReference');
    const orderNotifType   = searchParams.get('OrderNotificationType') || searchParams.get('orderNotificationType');

    console.log('[pesapal/ipn]', { orderTrackingId, orderMerchantRef, orderNotifType });

    if (!orderTrackingId) {
      return NextResponse.json({ error: 'Missing OrderTrackingId' }, { status: 400 });
    }

    const status = await getTransactionStatus(orderTrackingId);
    console.log('[pesapal/ipn] status:', status.payment_status_description);

    if (status.payment_status_description === PESAPAL_PAID_STATUS) {
      const { data: payment } = await publicSupabase
        .from('platform_payments')
        .select('user_id')
        .eq('pesapal_order_id', orderTrackingId)
        .single();

      if (payment?.user_id) {
        await Promise.all([
          publicSupabase
            .from('profiles')
            .update({
              subscription_status: 'paid',
              subscription_plan:   'lifetime',
              pesapal_order_id:    orderTrackingId,
            })
            .eq('id', payment.user_id),

          publicSupabase
            .from('platform_payments')
            .update({
              status:              'completed',
              pesapal_tracking_id: status.confirmation_code ?? orderTrackingId,
              confirmed_at:        new Date().toISOString(),
            })
            .eq('pesapal_order_id', orderTrackingId),
        ]);

        console.log('[pesapal/ipn] user marked as paid:', payment.user_id);
      }
    }

    return NextResponse.json({ orderNotificationType: orderNotifType, orderTrackingId, orderMerchantRef, status: 200 });
  } catch (err) {
    console.error('[pesapal/ipn]', err);
    return NextResponse.json({ error: 'IPN handling failed' }, { status: 500 });
  }
}
