import { NextRequest, NextResponse } from 'next/server';
import { publicSupabase } from '@/lib/supabase/public';

const DEFAULT_TEMPLATES = [
  {
    key: 'review_request',
    label: 'Review Request (to Guest)',
    body: "Hi {{first_name}}! Thank you for staying with us. We'd love your feedback - please leave a quick review: {{review_url}} - Kogelo Suites",
    variables: ['first_name','review_url'],
  },
];

export async function GET() {
  const { data, error } = await publicSupabase
    .from('sms_templates')
    .select('key, label, body, variables')
    .order('key');

  // If table missing or empty, auto-seed defaults
  if (error || !data || data.length === 0) {
    if (!error) {
      // Table exists but empty — seed it
      await publicSupabase.from('sms_templates').upsert(
        DEFAULT_TEMPLATES.map(t => ({ ...t, updated_at: new Date().toISOString() })),
        { onConflict: 'key' }
      );
    }
    // Return the hardcoded defaults so the UI always shows something
    return NextResponse.json({ templates: DEFAULT_TEMPLATES });
  }

  return NextResponse.json({ templates: data });
}

export async function PATCH(req: NextRequest) {
  const { key, body } = await req.json();
  if (!key || !body) return NextResponse.json({ error: 'key and body required' }, { status: 400 });
  const { error } = await publicSupabase
    .from('sms_templates')
    .update({ body, updated_at: new Date().toISOString() })
    .eq('key', key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
