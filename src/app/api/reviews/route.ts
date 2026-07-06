import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publicSupabase } from '@/lib/supabase/public';
import { sendSms, normalizePhone } from '@/lib/sms';

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get('property_id');

  let query = publicSupabase
    .from('reviews')
    .select('id, guest_name, property_name, property_id, stay_dates, rating, comment, submitted_at, is_featured')
    .eq('submitted', true)
    .order('submitted_at', { ascending: false });

  if (propertyId) query = query.eq('property_id', propertyId);
  else query = query.limit(20);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    let hostId = process.env.STAY_HOST_USER_ID ?? '';
    if (!hostId) {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      hostId = session.user.id;

      // Pro plan check — review requests are a Pro feature
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_status')
        .eq('id', session.user.id)
        .single();
      const isPro = profile?.subscription_status === 'paid' && profile?.subscription_plan === 'pro';
      if (!isPro) {
        return NextResponse.json({ error: 'Automated review requests require a Pro plan.' }, { status: 403 });
      }
    }

    const { booking_request_id, guest_name, guest_phone, property_id, property_name, stay_dates } = await req.json();
    if (!guest_name || !guest_phone) {
      return NextResponse.json({ error: 'guest_name and guest_phone are required' }, { status: 400 });
    }

    const { data, error } = await publicSupabase
      .from('reviews')
      .insert({
        booking_request_id: booking_request_id ?? null,
        guest_name,
        guest_phone,
        property_id: property_id ?? null,
        property_name: property_name ?? '',
        stay_dates: stay_dates ?? '',
        host_user_id: hostId,
      })
      .select('review_token')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const firstName = guest_name.split(' ')[0];
    const smsMessage = `Hi ${firstName}! Thank you for staying with us at HostDash. We'd love your feedback — please contact us to share your experience. Thank you!`;
    const smsResult = await sendSms(normalizePhone(guest_phone), smsMessage);

    if (!smsResult.ok) console.error('[SMS review] error:', smsResult.error);
    return NextResponse.json({ review_token: data.review_token, sms_sent: smsResult.ok, sms_error: smsResult.error ?? null });
  } catch (err) {
    console.error('[POST /api/reviews]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
