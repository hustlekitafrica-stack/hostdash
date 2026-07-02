import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publicSupabase } from '@/lib/supabase/public';

export async function GET() {
  try {
    let hostId = process.env.STAY_HOST_USER_ID ?? '';
    if (!hostId) {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      hostId = session.user.id;
    }

    const { data, error } = await publicSupabase
      .from('booking_requests')
      .select('*')
      .or(`host_user_id.eq.${hostId},host_user_id.eq.`)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ requests: data ?? [] });
  } catch (err) {
    console.error('[GET /api/requests]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
