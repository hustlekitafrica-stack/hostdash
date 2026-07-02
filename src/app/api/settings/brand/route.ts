import { NextResponse } from 'next/server';
import { publicSupabase } from '@/lib/supabase/public';

export async function GET() {
  try {
    const hostId = process.env.STAY_HOST_USER_ID;
    if (!hostId) return NextResponse.json({ logo_url: '', favicon_url: '', business_name: 'HostDash' });

    const { data, error } = await publicSupabase
      .from('profiles')
      .select('logo_url, favicon_url, business_name')
      .eq('id', hostId)
      .maybeSingle();

    if (error || !data) return NextResponse.json({ logo_url: '', favicon_url: '', business_name: 'HostDash' });

    return NextResponse.json({
      logo_url:      data.logo_url      ?? '',
      favicon_url:   data.favicon_url   ?? '',
      business_name: data.business_name ?? 'HostDash',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json({ logo_url: '', favicon_url: '', business_name: 'HostDash' });
  }
}
