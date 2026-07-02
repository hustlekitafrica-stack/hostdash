import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateICal } from '@/lib/ical';

interface Params { params: Promise<{ token: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient();
    const { token } = await params;

    const { data: connection, error: connErr } = await supabase
      .from('channel_connections')
      .select('property_id, user_id, channel')
      .eq('export_token', token)
      .single();

    if (connErr || !connection) {
      return new NextResponse('Invalid export token', { status: 404 });
    }

    // Fetch active bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, check_in, check_out, status, guests(name)')
      .eq('property_id', connection.property_id)
      .eq('user_id', connection.user_id)
      .not('status', 'in', '("cancelled","no_show")')
      .order('check_in');

    // Fetch blocked dates
    const { data: blocked } = await supabase
      .from('blocked_dates')
      .select('id, start_date, end_date, reason, source_channel')
      .eq('property_id', connection.property_id)
      .eq('user_id', connection.user_id)
      .order('start_date');

    const events: { uid: string; summary: string; start: string; end: string; description?: string; timestamp?: string }[] = [];

    for (const b of (bookings ?? [])) {
      const raw = b.guests as unknown;
      const g: { name: string } | null = Array.isArray(raw) ? (raw[0] ?? null) : (raw as { name: string } | null);
      const summary = b.status === 'blocked' ? 'Blocked' : (g?.name || 'Booking');
      events.push({
        uid: `${b.id}@hostbooks.ke`,
        summary,
        start: b.check_in,
        end: b.check_out,
        description: b.status === 'blocked' ? 'Blocked dates' : `HostBooks booking (${b.status})`,
      });
    }

    for (const d of (blocked ?? [])) {
      events.push({
        uid: `${d.id}@hostbooks.ke`,
        summary: d.reason || 'Blocked',
        start: d.start_date,
        end: d.end_date,
        description: d.source_channel ? `Blocked via ${d.source_channel}` : 'Blocked dates',
      });
    }

    const ics = generateICal(events, 'HostBooks Calendar');
    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="hostbooks-calendar.ics"',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    console.error('[GET /api/calendar/export/[token]]', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
