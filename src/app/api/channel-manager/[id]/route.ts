import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function getUserId(): Promise<string | null> {
  const stayUserId = process.env.STAY_HOST_USER_ID ?? '';
  if (stayUserId) return stayUserId;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = await createClient();

    const { id } = await params;
    const body = await request.json();
    const { ical_import_url, is_active, display_name, channel } = body;

    const { data: connection, error } = await supabase
      .from('channel_connections')
      .update({
        ...(ical_import_url !== undefined && { ical_import_url }),
        ...(is_active !== undefined && { is_active }),
        ...(display_name !== undefined && { display_name }),
        ...(channel !== undefined && { channel }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ connection });
  } catch (err) {
    console.error('[PATCH /api/channel-manager/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = await createClient();

    const { id } = await params;

    // Delete associated blocked dates first (RLS policies should handle ownership)
    await supabase.from('blocked_dates').delete().eq('channel_connection_id', id).eq('user_id', userId);

    const { error } = await supabase
      .from('channel_connections')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/channel-manager/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
