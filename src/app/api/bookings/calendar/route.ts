import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    let userId = process.env.STAY_HOST_USER_ID ?? '';
    if (!userId) {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = session.user.id;
    }
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth()));

    const from = new Date(year, month, 1).toISOString().split('T')[0];
    const to = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const [{ data: properties }, { data: rawBookings }, { data: rawBlocked }] = await Promise.all([
      supabase
        .from('properties')
        .select('id, name, nightly_rate, cleaning_fee')
        .eq('user_id', userId)
        .neq('status', 'draft')
        .order('created_at'),
      supabase
        .from('bookings')
        .select('id, property_id, check_in, check_out, nights, nightly_rate, total_amount, booking_source, status, notes, guests(name, phone, email)')
        .eq('user_id', userId)
        .neq('status', 'cancelled')
        .lte('check_in', to)
        .gte('check_out', from)
        .order('check_in'),
      supabase
        .from('blocked_dates')
        .select('id, property_id, start_date, end_date, reason, source_channel')
        .eq('user_id', userId)
        .lte('start_date', to)
        .gte('end_date', from)
        .order('start_date'),
    ]);

    const bookings = (rawBookings ?? []).map((b) => {
      const raw = b.guests as unknown;
      const g: { name: string; phone?: string; email?: string } | null =
        Array.isArray(raw) ? (raw[0] ?? null) : (raw as { name: string } | null);
      return {
        id: b.id,
        property_id: b.property_id,
        check_in: b.check_in,
        check_out: b.check_out,
        nights: b.nights,
        nightly_rate: b.nightly_rate,
        total_amount: b.total_amount,
        booking_source: b.booking_source,
        status: b.status,
        notes: b.notes,
        guest_name: g?.name ?? 'Unknown',
        guest_phone: g?.phone ?? '',
        guest_email: g?.email ?? '',
        source_channel: null,
      };
    });

    const blockedBookings = (rawBlocked ?? []).map((d) => ({
      id: d.id,
      property_id: d.property_id,
      check_in: d.start_date,
      check_out: d.end_date,
      nights: 0,
      nightly_rate: 0,
      total_amount: 0,
      booking_source: d.source_channel ?? 'blocked',
      status: 'blocked',
      notes: d.reason ?? '',
      guest_name: d.reason || 'Blocked',
      guest_phone: '',
      guest_email: '',
      source_channel: d.source_channel,
    }));

    return NextResponse.json({ bookings: [...bookings, ...blockedBookings], properties: properties ?? [] });
  } catch (err) {
    console.error('[bookings/calendar]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
