import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('active', true)
      .order('tab')
      .order('position');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    console.error('[menu/GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        tab:         body.tab,
        category:    body.category ?? '',
        name:        body.name,
        description: body.description ?? '',
        price:       Number(body.price) || 0,
        tag:         body.tag || null,
        position:    Number(body.position) || 0,
        active:      body.active !== false,
        image_url:   body.image_url ?? null,
        host_user_id: session.user.id,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    console.error('[menu/POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
