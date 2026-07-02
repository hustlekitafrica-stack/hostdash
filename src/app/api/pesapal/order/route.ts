import { NextRequest, NextResponse } from 'next/server';
import { publicSupabase } from '@/lib/supabase/public';

const BASE_URL =
  process.env.PESAPAL_ENV === 'live'
    ? 'https://pay.pesapal.com/v3'
    : 'https://cybqa.pesapal.com/pesapalv3';

async function getPesapalToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      consumer_key:    process.env.PESAPAL_CONSUMER_KEY ?? '',
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET ?? '',
    }),
  });
  const text = await res.text();
  console.log('[pesapal/token] HTTP', res.status, text);
  let data: any = {};
  try { data = JSON.parse(text); } catch { throw new Error(`Pesapal returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`); }
  const errMsg = data.message ?? (typeof data.error === 'string' ? data.error : data.error?.message ?? JSON.stringify(data.error));
  if (!data.token) throw new Error(errMsg ?? `Failed to get Pesapal token (HTTP ${res.status})`);
  return data.token as string;
}

async function registerIpn(token: string): Promise<string> {
  const ipnUrl = process.env.PESAPAL_IPN_URL ?? '';
  const res = await fetch(`${BASE_URL}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: 'POST' }),
  });
  const data = await res.json();
  console.log('[pesapal/ipn-register] HTTP', res.status, JSON.stringify(data));
  return (data.ipn_id ?? '') as string;
}

export async function POST(req: NextRequest) {
  try {
    const { booking_request_id, amount, guest_name, guest_email, guest_phone } = await req.json();

    if (!booking_request_id || !amount) {
      return NextResponse.json({ error: 'booking_request_id and amount are required' }, { status: 400 });
    }

    if (!process.env.PESAPAL_CONSUMER_KEY?.trim() || !process.env.PESAPAL_CONSUMER_SECRET?.trim()) {
      return NextResponse.json({ error: 'Pesapal not configured — add PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET to .env.local' }, { status: 503 });
    }

    if (!process.env.PESAPAL_ENV || (process.env.PESAPAL_ENV !== 'live' && process.env.PESAPAL_ENV !== 'sandbox')) {
      return NextResponse.json({
        error: `PESAPAL_ENV is "${process.env.PESAPAL_ENV ?? '(not set)'}". It must be exactly "live" or "sandbox" in .env.local`,
      }, { status: 503 });
    }

    const token = await getPesapalToken();
    const ipnId = await registerIpn(token);

    const callbackUrl = process.env.PESAPAL_CALLBACK_URL ?? '';
    const nameParts   = (guest_name ?? 'Guest').trim().split(' ');
    const firstName   = nameParts[0];
    const lastName    = nameParts.slice(1).join(' ') || nameParts[0];

    const orderPayload = {
      id:               booking_request_id,
      currency:         'KES',
      amount:           Number(amount),
      description:      `Kogelo Suites booking – ${booking_request_id.slice(0, 8).toUpperCase()}`,
      callback_url:     callbackUrl,
      redirect_mode:    '',
      notification_id:  ipnId,
      billing_address: {
        email_address: guest_email ?? '',
        phone_number:  guest_phone ?? '',
        first_name:    firstName,
        last_name:     lastName,
      },
    };

    const orderRes = await fetch(`${BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(orderPayload),
    });
    const orderData = await orderRes.json();

    console.log('[pesapal/order] HTTP', orderRes.status, JSON.stringify(orderData));
    if (!orderData.redirect_url) {
      const detail = orderData.message ?? orderData.error?.message ?? JSON.stringify(orderData);
      return NextResponse.json({ error: `Pesapal order failed: ${detail}` }, { status: 500 });
    }

    await publicSupabase
      .from('booking_requests')
      .update({ pesapal_order_id: orderData.order_tracking_id, payment_status: 'pending' })
      .eq('id', booking_request_id);

    return NextResponse.json({
      redirect_url:      orderData.redirect_url,
      order_tracking_id: orderData.order_tracking_id,
    });
  } catch (err: any) {
    console.error('[pesapal/order]', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
