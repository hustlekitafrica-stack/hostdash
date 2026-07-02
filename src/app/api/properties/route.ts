import { NextResponse } from 'next/server';
import { publicSupabase } from '@/lib/supabase/public';

export async function GET(req: Request) {
  try {
    const hostId = process.env.STAY_HOST_USER_ID;
    const { searchParams } = new URL(req.url);
    const checkIn  = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    let query = publicSupabase
      .from('properties')
      .select('id, name, type, description, location, address, city, county, bedrooms, bathrooms, max_guests, nightly_rate, weekend_rate, cover_photo, status, latitude, longitude, check_in_time, check_out_time')
      .eq('status', 'active')
      .order('name');

    if (hostId) query = query.eq('user_id', hostId);

    const { data: properties, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const today    = new Date().toISOString().split('T')[0];
    const addDays  = (d: string, n: number) => {
      const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0];
    };
    const rangeStart = checkIn  || today;
    const rangeEnd   = checkOut || addDays(today, 1);
    const lastNight  = addDays(rangeEnd, -1);
    const blockedIds: Set<string> = new Set();

    try {
      let bq = publicSupabase
        .from('bookings')
        .select('property_id')
        .in('status', ['confirmed', 'tentative', 'checked_in', 'blocked'])
        .lte('check_in',  lastNight)
        .gte('check_out', addDays(rangeStart, 1));
      if (hostId) bq = bq.eq('user_id', hostId);
      const { data: bRows } = await bq;
      (bRows ?? []).forEach((b: any) => { if (b.property_id) blockedIds.add(b.property_id); });
    } catch { /* continue */ }

    try {
      let rq = publicSupabase
        .from('booking_requests')
        .select('room_details')
        .in('status', ['confirmed', 'pending'])
        .lte('check_in',  lastNight)
        .gte('check_out', addDays(rangeStart, 1));
      if (hostId) rq = rq.eq('host_user_id', hostId);
      const { data: rRows } = await rq;
      (rRows ?? []).forEach((r: any) => {
        const rooms = Array.isArray(r.room_details) ? r.room_details : [];
        rooms.forEach((room: any) => { if (room.property_id) blockedIds.add(room.property_id); });
      });
    } catch { /* ignore */ }

    const withPhotos = await Promise.all(
      (properties ?? []).filter((p: any) => !blockedIds.has(p.id)).map(async (p: any) => {
        const { data: photos } = await publicSupabase
          .from('property_photos')
          .select('url, sort_order')
          .eq('property_id', p.id)
          .order('sort_order')
          .limit(5);
        const { data: amenities } = await publicSupabase
          .from('property_amenities')
          .select('name')
          .eq('property_id', p.id);
        return {
          ...p,
          photos: photos?.map((ph: any) => ph.url) ?? (p.cover_photo ? [p.cover_photo] : []),
          amenities: amenities?.map((a: any) => a.name) ?? [],
        };
      })
    );

    return NextResponse.json({ properties: withPhotos });
  } catch (err) {
    console.error('[/api/properties]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
