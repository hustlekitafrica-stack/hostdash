import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parseICal } from '@/lib/ical';

async function getUserId(): Promise<string | null> {
  const stayUserId = process.env.STAY_HOST_USER_ID ?? '';
  if (stayUserId) return stayUserId;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

interface Params { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = await createClient();

    const { id } = await params;

    const { data: connection, error: fetchErr } = await supabase
      .from('channel_connections')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !connection) {
      return NextResponse.json({ error: 'Channel connection not found' }, { status: 404 });
    }

    if (!connection.ical_import_url) {
      return NextResponse.json({ error: 'No import URL configured' }, { status: 400 });
    }

    // Fetch the iCal feed
    let text: string;
    try {
      const res = await fetch(connection.ical_import_url, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fetch failed';
      await supabase.from('channel_connections').update({
        sync_status: 'error',
        sync_error: msg,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      return NextResponse.json({ error: `Failed to fetch iCal feed: ${msg}` }, { status: 502 });
    }

    const parsed = parseICal(text);
    let imported = 0;
    const now = new Date().toISOString();

    for (const ev of parsed) {
      const start = ev.dtstart;
      // iCal DTEND is usually the day after checkout for all-day events
      const end = ev.dtend;
      const uid = ev.uid;

      if (!start || !end) continue;
      if (end <= start) continue;

      // Dedup by external_uid + property_id + channel_connection_id
      const { data: existing } = await supabase
        .from('blocked_dates')
        .select('id')
        .eq('external_uid', uid)
        .eq('property_id', connection.property_id)
        .eq('channel_connection_id', id)
        .maybeSingle();

      if (existing) {
        // Update dates if they changed
        await supabase.from('blocked_dates')
          .update({ start_date: start, end_date: end, reason: ev.summary || 'Blocked', updated_at: now })
          .eq('id', existing.id);
      } else {
        await supabase.from('blocked_dates').insert({
          user_id: userId,
          property_id: connection.property_id,
          channel_connection_id: id,
          source_channel: connection.channel,
          external_uid: uid,
          start_date: start,
          end_date: end,
          reason: ev.summary || 'Blocked',
        });
      }
      imported++;
    }

    // Clean up stale blocked dates for this channel (events no longer in the feed)
    const keepIds = parsed.map(ev => ev.uid);
    const { data: stale } = await supabase
      .from('blocked_dates')
      .select('id, external_uid')
      .eq('channel_connection_id', id)
      .eq('user_id', userId);

    if (stale && stale.length > 0) {
      const toDelete = stale.filter(row => !keepIds.includes(row.external_uid));
      if (toDelete.length > 0) {
        await supabase.from('blocked_dates').delete().in('id', toDelete.map(row => row.id));
      }
    }

    const { data: updated } = await supabase
      .from('channel_connections')
      .update({
        last_synced_at: now,
        sync_status: 'ok',
        sync_error: null,
        events_imported: imported,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    return NextResponse.json({ connection: updated, events_imported: imported });
  } catch (err) {
    console.error('[POST /api/channel-manager/[id]/sync]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
