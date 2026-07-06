import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    let userId = process.env.STAY_HOST_USER_ID ?? '';
    if (!userId) {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        userId = session.user.id;
      } else {
        const apiUser = await authenticateApiKey(request);
        if (!apiUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        userId = apiUser.userId;
      }
    }

    const supabase = await createClient();
    const { data: guests, error } = await supabase
      .from('guests')
      .select('id, name, phone, email, bookings(id, total_amount, check_in, status)')
      .eq('user_id', userId)
      .order('name');

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const enriched = (guests ?? []).map((g) => {
      const raw = (g.bookings as { id: string; total_amount: number; check_in: string; status: string }[]) ?? [];
      const active = raw.filter(b => b.status !== 'cancelled' && b.status !== 'no_show' && b.status !== 'blocked');
      const sorted = [...active].sort((a, b) => b.check_in > a.check_in ? 1 : -1);
      return {
        id: g.id,
        name: g.name,
        phone: g.phone ?? '',
        email: g.email ?? '',
        total_stays: active.length,
        total_spent: active.reduce((s, b) => s + (Number(b.total_amount) || 0), 0),
        last_stay: sorted[0]?.check_in ?? null,
        bookings: sorted,
      };
    });

    return NextResponse.json({ guests: enriched });
  } catch (err) {
    console.error('[GET /api/guests]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let userId = process.env.STAY_HOST_USER_ID ?? '';
    if (!userId) {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = session.user.id;
    }
    const supabase = await createClient();

    const { name, phone, email = '' } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ error: 'Phone is required' }, { status: 400 });

    const { data: guest, error } = await supabase
      .from('guests')
      .insert({ user_id: userId, name: name.trim(), phone: phone.trim(), email: email.trim() })
      .select('id, name, phone, email')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ guest: { ...guest, total_stays: 0, total_spent: 0, last_stay: null, bookings: [] } });
  } catch (err) {
    console.error('[POST /api/guests]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
