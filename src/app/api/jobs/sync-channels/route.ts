import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parseICal } from '@/lib/ical';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Authenticate the cron request
    const authHeader = request.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!CRON_SECRET || token !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Use service role if available (for cron job); otherwise fall back to anon session
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let client = supabase;
    if (serviceRoleKey) {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      client = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
    }

    const { data: channels, error } = await client
      .from('channel_connections')
      .select('*')
      .eq('is_active', true)
      .order('created_at');

    if (error) {
      console.error('[sync-channels] fetch channels error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: { id: string; status: string; events_imported: number; error?: string }[] = [];
    const now = new Date().toISOString();

    for (const conn of (channels ?? [])) {
      if (!conn.ical_import_url) {
        results.push({ id: conn.id, status: 'skipped', events_imported: 0, error: 'No import URL' });
        continue;
      }

      let text: string;
      try {
        const res = await fetch(conn.ical_import_url, { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        text = await res.text();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Fetch failed';
        await client.from('channel_connections').update({
          sync_status: 'error',
          sync_error: msg,
          updated_at: now,
        }).eq('id', conn.id);
        results.push({ id: conn.id, status: 'error', events_imported: 0, error: msg });
        continue;
      }

      const parsed = parseICal(text);
      let imported = 0;
      const keepIds: string[] = [];

      for (const ev of parsed) {
        const start = ev.dtstart;
        const end = ev.dtend;
        const uid = ev.uid;
        if (!start || !end || end <= start) continue;
        keepIds.push(uid);

        const { data: existing } = await client
          .from('blocked_dates')
          .select('id')
          .eq('external_uid', uid)
          .eq('property_id', conn.property_id)
          .eq('channel_connection_id', conn.id)
          .maybeSingle();

        if (existing) {
          await client.from('blocked_dates')
            .update({ start_date: start, end_date: end, reason: ev.summary || 'Blocked', updated_at: now })
            .eq('id', existing.id);
        } else {
          await client.from('blocked_dates').insert({
            user_id: conn.user_id,
            property_id: conn.property_id,
            channel_connection_id: conn.id,
            source_channel: conn.channel,
            external_uid: uid,
            start_date: start,
            end_date: end,
            reason: ev.summary || 'Blocked',
          });
        }
        imported++;
      }

      // Remove stale events
      const { data: stale } = await client
        .from('blocked_dates')
        .select('id, external_uid')
        .eq('channel_connection_id', conn.id);
      if (stale && stale.length > 0) {
        const toDelete = stale.filter(row => !keepIds.includes(row.external_uid ?? ''));
        if (toDelete.length > 0) {
          await client.from('blocked_dates').delete().in('id', toDelete.map(row => row.id));
        }
      }

      await client.from('channel_connections').update({
        last_synced_at: now,
        sync_status: 'ok',
        sync_error: null,
        events_imported: imported,
        updated_at: now,
      }).eq('id', conn.id);

      results.push({ id: conn.id, status: 'ok', events_imported: imported });
    }

    return NextResponse.json({ synced: results.length, results });
  } catch (err) {
    console.error('[POST /api/jobs/sync-channels]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
