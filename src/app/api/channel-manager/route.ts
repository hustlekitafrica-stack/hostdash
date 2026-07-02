import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

async function getUserId(): Promise<string | null> {
  const stayUserId = process.env.STAY_HOST_USER_ID ?? '';
  if (stayUserId) return stayUserId;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = await createClient();

    const { data: connections, error } = await supabase
      .from('channel_connections')
      .select('id, property_id, channel, display_name, ical_import_url, export_token, last_synced_at, sync_status, sync_error, events_imported, is_active, created_at, properties(id, name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ connections: connections ?? [] });
  } catch (err) {
    console.error('[GET /api/channel-manager]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = await createClient();

    const body = await request.json();
    const { property_id, channel, display_name, ical_import_url } = body;

    if (!property_id || !channel || !ical_import_url) {
      return NextResponse.json({ error: 'property_id, channel, and ical_import_url are required' }, { status: 400 });
    }

    // Verify property belongs to user
    const { data: prop } = await supabase
      .from('properties')
      .select('id')
      .eq('id', property_id)
      .eq('user_id', userId)
      .single();
    if (!prop) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const exportToken = randomBytes(24).toString('hex');
    const { data: connection, error } = await supabase
      .from('channel_connections')
      .insert({
        user_id: userId,
        property_id,
        channel,
        display_name: display_name || channel,
        ical_import_url,
        export_token: exportToken,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ connection });
  } catch (err) {
    console.error('[POST /api/channel-manager]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
