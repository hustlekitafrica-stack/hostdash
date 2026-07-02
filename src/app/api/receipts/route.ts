import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publicSupabase } from '@/lib/supabase/public';

const HOST_USER_ID = process.env.STAY_HOST_USER_ID ?? '';

/** GET /api/receipts — list all receipts for the host (newest first) */
export async function GET() {
  try {
    let hostId = HOST_USER_ID;
    if (!hostId) {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      hostId = session.user.id;
    }

    const { data, error } = await publicSupabase
      .from('receipts')
      .select('*')
      .eq('host_user_id', hostId)
      .order('issued_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ receipts: data ?? [] });
  } catch (err) {
    console.error('[GET /api/receipts]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/receipts — create a new receipt */
export async function POST(req: NextRequest) {
  try {
    let hostId = HOST_USER_ID;
    if (!hostId) {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      hostId = session.user.id;
    }

    const body = await req.json();
    const {
      guest_name,
      guest_phone,
      guest_email = '',
      property_name = '',
      room_details = [],
      check_in = null,
      check_out = null,
      nights = null,
      subtotal,
      tax_lines = [],
      amount_paid,
      payment_method = 'cash',
      payment_reference = '',
      notes = '',
    } = body;

    if (!guest_name?.trim()) return NextResponse.json({ error: 'Guest name is required' }, { status: 400 });
    if (!guest_phone?.trim()) return NextResponse.json({ error: 'Guest phone is required' }, { status: 400 });
    if (subtotal === undefined || subtotal === null) return NextResponse.json({ error: 'Subtotal is required' }, { status: 400 });
    if (amount_paid === undefined || amount_paid === null) return NextResponse.json({ error: 'Amount paid is required' }, { status: 400 });

    const sub   = Number(subtotal) || 0;
    const paid  = Number(amount_paid) || 0;

    // Calculate each tax line amount and total
    const resolvedTaxLines = (tax_lines as { label: string; rate: number }[]).map(tl => ({
      label:  tl.label,
      rate:   Number(tl.rate) || 0,
      amount: Math.round(sub * (Number(tl.rate) || 0) / 100 * 100) / 100,
    }));
    const taxTotal   = resolvedTaxLines.reduce((s, tl) => s + tl.amount, 0);
    const grandTotal = sub + taxTotal;
    const balanceDue = Math.max(0, grandTotal - paid);
    const isPartial  = paid < grandTotal && paid > 0;

    const { data, error } = await publicSupabase
      .from('receipts')
      .insert({
        host_user_id:       hostId,
        booking_request_id: null,
        guest_name:         guest_name.trim(),
        guest_phone:        guest_phone.trim(),
        guest_email:        guest_email.trim(),
        property_name:      property_name.trim(),
        room_details,
        check_in,
        check_out,
        nights,
        subtotal:           sub,
        tax_lines:          resolvedTaxLines,
        tax_total:          taxTotal,
        grand_total:        grandTotal,
        amount_paid:        paid,
        balance_due:        balanceDue,
        payment_method,
        payment_reference:  payment_reference.trim(),
        is_partial:         isPartial,
        notes:              notes.trim(),
      })
      .select('id, receipt_number, receipt_token')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data)  return NextResponse.json({ error: 'Receipt could not be created' }, { status: 500 });

    const firstName  = guest_name.trim().split(' ')[0];
    const waText     = encodeURIComponent(
      `Hi ${firstName}! 🧾 Here is your payment receipt from HostDash.\n\nReceipt No: ${data.receipt_number}\nAmount Paid: KSh ${paid.toLocaleString()}\n\nThank you for staying with us! – HostDash`
    );
    const whatsappLink = `https://wa.me/${guest_phone.trim().replace(/\D/g, '')}?text=${waText}`;

    return NextResponse.json({
      success:        true,
      id:             data.id,
      receipt_number: data.receipt_number,
      receipt_token:  data.receipt_token,
      whatsapp_link:  whatsappLink,
    });
  } catch (err) {
    console.error('[POST /api/receipts]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
