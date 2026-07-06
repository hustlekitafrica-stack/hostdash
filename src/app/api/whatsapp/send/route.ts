import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsApp } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pro plan check — WhatsApp notifications are a Pro feature
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan, subscription_status')
      .eq('id', user.id)
      .single();

    const isPro = profile?.subscription_status === 'paid' && profile?.subscription_plan === 'pro';
    if (!isPro) {
      return NextResponse.json(
        { error: 'WhatsApp notifications require a Pro plan.' },
        { status: 403 },
      );
    }

    const { to, message } = await req.json();
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Both "to" and "message" are required.' },
        { status: 400 },
      );
    }

    const result = await sendWhatsApp(to, message);

    return NextResponse.json({
      ok: result.ok,
      messageId: result.messageId ?? null,
      error: result.error ?? null,
    });
  } catch (err) {
    console.error('[POST /api/whatsapp/send]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
