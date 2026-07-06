import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function generateRawKey(): string {
  return 'sk_live_' + randomBytes(24).toString('hex');
}

/** GET — list active API keys for the current user */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Pro check
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan, subscription_status')
      .eq('id', user.id)
      .single();
    if (profile?.subscription_status !== 'paid' || profile?.subscription_plan !== 'pro') {
      return NextResponse.json({ error: 'API keys require a Pro plan.' }, { status: 403 });
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, key_prefix, label, created_at, last_used_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ keys: keys ?? [] });
  } catch (err) {
    console.error('[GET /api/api-keys]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST — generate a new API key */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Pro check
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan, subscription_status')
      .eq('id', user.id)
      .single();
    if (profile?.subscription_status !== 'paid' || profile?.subscription_plan !== 'pro') {
      return NextResponse.json({ error: 'API keys require a Pro plan.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const label = (body.label ?? 'Default').toString().slice(0, 100);

    const rawKey = generateRawKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const { error } = await supabase.from('api_keys').insert({
      user_id: user.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      label,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ raw_key: rawKey, key_prefix: keyPrefix, label });
  } catch (err) {
    console.error('[POST /api/api-keys]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE — revoke an API key */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing key id' }, { status: 400 });

    const { error } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/api-keys]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
