import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsApp, buildGuestBookingConfirmedWA, buildAdminBookingConfirmedWA } from '@/lib/whatsapp';

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

    const body = await request.json();
    const {
      guest_name,
      guest_phone = '',
      guest_email = '',
      property_id,
      check_in,
      check_out,
      nightly_rate = 0,
      cleaning_fee = 0,
      extra_fees = 0,
      discount = 0,
      security_deposit = 0,
      booking_source = 'Direct',
      status = 'confirmed',
      notes = '',
      is_blocked = false,
      block_reason = '',
      payment_intent = 'none',
      payment_amount = 0,
      payments = [],
    } = body;

    if (!property_id || !check_in || !check_out) {
      return NextResponse.json({ error: 'property_id, check_in, and check_out are required' }, { status: 400 });
    }

    const resolvedName = is_blocked ? (block_reason || 'Blocked') : guest_name;
    if (!resolvedName) return NextResponse.json({ error: 'guest_name is required' }, { status: 400 });

    const nights = Math.round(
      (new Date(check_out).getTime() - new Date(check_in).getTime()) / 86400000
    );
    if (nights <= 0) return NextResponse.json({ error: 'check_out must be after check_in' }, { status: 400 });

    // Check for overlapping active bookings on the same property
    if (!is_blocked) {
      const { data: overlap } = await supabase
        .from('bookings')
        .select('id, check_in, check_out')
        .eq('property_id', property_id)
        .eq('user_id', userId)
        .not('status', 'in', '("cancelled","no_show","blocked")')
        .lt('check_in', check_out)
        .gt('check_out', check_in)
        .limit(1);
      if (overlap && overlap.length > 0) {
        return NextResponse.json({
          error: `These dates overlap with an existing booking (${overlap[0].check_in} – ${overlap[0].check_out}). Please choose different dates.`
        }, { status: 409 });
      }
    }

    const rate = is_blocked ? 0 : Number(nightly_rate);
    const cleaningFee = is_blocked ? 0 : Number(cleaning_fee);
    const extraFees = is_blocked ? 0 : Number(extra_fees);
    const discountVal = is_blocked ? 0 : Number(discount);
    const totalAmount = Math.max(0, rate * nights + cleaningFee + extraFees - discountVal);
    // Support both legacy single-payment and new payments array
    const paid = payment_intent !== 'none'
      ? (payments as {amount:number}[]).reduce((s, p) => s + (Number(p.amount) || 0), 0)
      : (Number(payment_amount) || 0);

    // Upsert guest: reuse existing guest with same name for this user
    const { data: existingGuest } = await supabase
      .from('guests')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', resolvedName.trim())
      .maybeSingle();

    let guestId: string;
    if (existingGuest) {
      guestId = existingGuest.id;
    } else {
      const { data: newGuest, error: guestErr } = await supabase
        .from('guests')
        .insert({ user_id: userId, name: resolvedName.trim(), phone: guest_phone, email: guest_email })
        .select('id')
        .single();
      if (guestErr) return NextResponse.json({ error: guestErr.message }, { status: 400 });
      guestId = newGuest.id;
    }

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        property_id,
        guest_id: guestId,
        check_in,
        check_out,
        nights,
        nightly_rate: rate,
        cleaning_fee: cleaningFee,
        security_deposit: Number(security_deposit) || 0,
        total_amount: totalAmount,
        amount_paid: paid,
        balance_due: totalAmount - paid,
        payment_status: paid >= totalAmount && totalAmount > 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
        status: is_blocked ? 'blocked' : status,
        booking_source: is_blocked ? 'blocked' : booking_source,
        notes,
      })
      .select()
      .single();

    if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 });

    // Block dates for this property — try with booking_id first (migration 06), fall back without
    if (booking) {
      const blockReason = is_blocked
        ? (block_reason || 'Blocked')
        : `Booking (${booking_source || 'Direct'})`;
      const { error: bdErr } = await supabase.from('blocked_dates').insert({
        property_id,
        user_id: userId,
        start_date: check_in,
        end_date: check_out,
        reason: blockReason,
        booking_id: booking.id,
      });
      if (bdErr) {
        // booking_id column may not exist yet — retry without it
        await supabase.from('blocked_dates').insert({
          property_id,
          user_id: userId,
          start_date: check_in,
          end_date: check_out,
          reason: blockReason,
        });
      }
    }

    // Record one payment_log row per payment entry
    type PmtEntry = {
      amount: number; method: string; date_type: string; date: string | null; notes: string;
      extra?: {
        mpesa_code?: string; cash_receipt?: string; card_last4?: string;
        bank_confirmation?: string; bank_reference?: string;
      };
    };
    if (booking && (payments as PmtEntry[]).length > 0 && payment_intent !== 'none') {
      for (const pmt of payments as PmtEntry[]) {
        const pmtAmt = Number(pmt.amount) || 0;
        if (pmtAmt <= 0) continue;
        const paidAt = pmt.date_type === 'pick' && pmt.date
          ? new Date(pmt.date).toISOString()
          : new Date().toISOString();
        await supabase.from('payment_logs').insert({
          booking_id: booking.id,
          user_id: userId,
          property_id,
          amount: pmtAmt,
          currency: 'KES',
          payment_method: pmt.method ?? 'cash',
          paid_at: paidAt,
          mpesa_code: pmt.extra?.mpesa_code || null,
          cash_receipt_number: pmt.extra?.cash_receipt || null,
          card_last_four: pmt.extra?.card_last4 || null,
          bank_reference: pmt.extra?.bank_confirmation || pmt.extra?.bank_reference || null,
          notes: pmt.notes || null,
        });
      }
    } else if (booking && Number(payment_amount) > 0) {
      await supabase.from('payment_logs').insert({
        booking_id: booking.id,
        user_id: userId,
        property_id,
        amount: Number(payment_amount),
        currency: 'KES',
        payment_method: 'cash',
        paid_at: new Date().toISOString(),
      });
    }

    // Send WhatsApp notifications for confirmed bookings (Pro users only, non-blocking)
    if (booking && !is_blocked && status === 'confirmed' && guest_phone) {
      (async () => {
        try {
          const { data: hostProfile } = await supabase
            .from('profiles')
            .select('subscription_plan, subscription_status, whatsapp_phone')
            .eq('id', userId)
            .single();
          const isPro = hostProfile?.subscription_status === 'paid' && hostProfile?.subscription_plan === 'pro';
          if (!isPro || !process.env.WHATSAPP_FROM) return;

          // Get property name
          const { data: prop } = await supabase.from('properties').select('name').eq('id', property_id).single();
          const propName = prop?.name ?? 'your property';
          const ref = booking.id ?? '';

          // Send to guest
          await sendWhatsApp(guest_phone, buildGuestBookingConfirmedWA({
            guestName: resolvedName, propertyName: propName,
            checkIn: check_in, checkOut: check_out, nights, total: totalAmount, ref,
          }));

          // Send to admin
          const adminPhone = hostProfile?.whatsapp_phone || process.env.ADMIN_PHONE;
          if (adminPhone) {
            await sendWhatsApp(adminPhone, buildAdminBookingConfirmedWA({
              guestName: resolvedName, guestPhone: guest_phone, propertyName: propName,
              checkIn: check_in, checkOut: check_out, amount: totalAmount, ref,
            }));
          }
        } catch (waErr) {
          console.error('[WhatsApp booking notify]', waErr);
        }
      })();
    }

    return NextResponse.json({ booking });
  } catch (err) {
    console.error('[POST /api/bookings]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
