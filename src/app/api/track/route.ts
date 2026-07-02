import { NextRequest, NextResponse } from 'next/server';
import { publicSupabase } from '@/lib/supabase/public';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const path = (body.path as string)?.trim();
    if (!path) return NextResponse.json({ ok: false }, { status: 400 });

    const today = new Date().toISOString().split('T')[0];

    await publicSupabase.rpc('upsert_page_view', { p_path: path, p_date: today }).maybeSingle();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
