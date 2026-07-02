import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.name        !== undefined) updates.name        = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price       !== undefined) updates.price       = Number(body.price);
    if (body.tag         !== undefined) updates.tag         = body.tag || null;
    if (body.category    !== undefined) updates.category    = body.category;
    if (body.tab         !== undefined) updates.tab         = body.tab;
    if (body.active      !== undefined) updates.active      = body.active;
    if (body.position    !== undefined) updates.position    = Number(body.position);
    if (body.image_url   !== undefined) updates.image_url   = body.image_url;

    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  } catch (err) {
    console.error('[menu/PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[menu/DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
