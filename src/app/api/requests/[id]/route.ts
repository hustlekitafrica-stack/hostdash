import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publicSupabase } from '@/lib/supabase/public';
import {
  sendSmsBulk,
  buildGuestAcceptedSms,
  buildGuestDeclinedSms,
  buildAdminConfirmedSms,
  normalizePhone,
} from '@/lib/sms';
import { fireMakeConfirmationWebhook } from '@/lib/makeWebhook';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!process.env.STAY_HOST_USER_ID) {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, notes, decline_reason, payment_link } = await req.json();
    if (!['confirmed', 'declined', 'cancelled', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) updates.special_requests = notes;
    if (decline_reason !== undefined) updates.decline_reason = decline_reason;

    const { data, error } = await publicSupabase
      .from('booking_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let guestCreated = false;
    let bookingCreated = false;
    let autoError = '';

    if (status === 'confirmed') {
      const bReq = data as any;
      let hostId = (bReq.host_user_id as string) || process.env.STAY_HOST_USER_ID || '';
      if (!hostId) {
        const authClient = await createClient();
        const { data: { session } } = await authClient.auth.getSession();
        hostId = session?.user?.id ?? '';
      }
      const bRooms = Array.isArray(bReq.room_details) ? bReq.room_details : [];

      if (!hostId) {
        autoError = 'Cannot determine host user ID — set STAY_HOST_USER_ID in .env.local';
        console.error('[auto-booking]', autoError);
      } else {
        let guestId: string | null = null;
        const { data: existingGuest, error: egErr } = await publicSupabase
          .from('guests').select('id').eq('user_id', hostId)
          .ilike('name', (bReq.guest_name ?? '').trim()).maybeSingle();
        if (egErr) console.error('[auto-booking] guest lookup:', egErr.message);

        if (existingGuest) {
          guestId = existingGuest.id;
          await publicSupabase.from('guests')
            .update({ phone: bReq.guest_phone, email: bReq.guest_email })
            .eq('id', guestId);
          guestCreated = true;
        } else {
          const { data: ng, error: ngErr } = await publicSupabase.from('guests')
            .insert({ user_id: hostId, name: (bReq.guest_name ?? '').trim(), phone: bReq.guest_phone ?? '', email: bReq.guest_email ?? '' })
            .select('id').single();
          if (ngErr) {
            autoError = `guest insert failed: ${ngErr.message}`;
            console.error('[auto-booking]', autoError);
          }
          if (ng) { guestId = ng.id; guestCreated = true; }
        }

        for (const room of bRooms) {
          if (!room.property_id) { console.error('[auto-booking] room missing property_id'); continue; }
          if (!guestId) { console.error('[auto-booking] no guestId — cannot create booking'); continue; }

          const bNights = bReq.nights || Math.round((new Date(bReq.check_out).getTime() - new Date(bReq.check_in).getTime()) / 86400000);
          const totalAmt = Number(room.subtotal) || 0;
          const { error: bkErr } = await publicSupabase.from('bookings').insert({
            user_id: hostId, property_id: room.property_id, guest_id: guestId,
            check_in: bReq.check_in, check_out: bReq.check_out, nights: bNights,
            nightly_rate: Number(room.nightly_rate) || 0, cleaning_fee: 0,
            security_deposit: 0, total_amount: totalAmt, amount_paid: 0,
            balance_due: totalAmt, payment_status: 'unpaid', status: 'confirmed',
            booking_source: 'Online', notes: bReq.special_requests || '',
          });
          if (bkErr) {
            autoError = `booking insert failed: ${bkErr.message}`;
            console.error('[auto-booking]', autoError);
          } else {
            bookingCreated = true;
          }
        }
      }
    }

    const req2       = data as any;
    const rooms      = Array.isArray(req2.room_details) ? req2.room_details : [];
    const propName   = rooms[0]?.property_name ?? 'Kogelo Suites';
    const adminPhone = normalizePhone(process.env.ADMIN_PHONE ?? '');
    const guestE164  = normalizePhone(req2.guest_phone ?? '');

    if (status === 'confirmed') {
      const shortRef = String(Math.floor(1000000 + parseInt(req2.id.replace(/-/g, '').slice(0, 9), 16) % 9000000));

      let coverPhotoUrl = '';
      const firstPropertyId = rooms[0]?.property_id;
      if (firstPropertyId) {
        const { data: propData } = await publicSupabase
          .from('properties').select('cover_photo').eq('id', firstPropertyId).single();
        coverPhotoUrl = propData?.cover_photo ?? '';
      }

      let guestEmail = req2.guest_email ?? '';

      if (!guestEmail && req2.guest_name) {
        const { data: guestRow } = await publicSupabase
          .from('guests').select('email')
          .ilike('name', (req2.guest_name as string).trim())
          .not('email', 'is', null).neq('email', '').maybeSingle();
        guestEmail = guestRow?.email ?? '';
      }

      if (!guestEmail && req2.guest_user_id) {
        try {
          const { createClient: createAdmin } = await import('@supabase/supabase-js');
          const adminClient = createAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          const { data: authData } = await adminClient.auth.admin.getUserById(req2.guest_user_id);
          guestEmail = authData?.user?.email ?? '';
          if (guestEmail) {
            await publicSupabase.from('booking_requests')
              .update({ guest_email: guestEmail }).eq('id', req2.id);
          }
        } catch (e) {
          console.error('[confirm] auth email lookup failed:', e);
        }
      }

      fireMakeConfirmationWebhook({
        id:               req2.id,
        short_ref:        shortRef,
        guest_name:       req2.guest_name ?? '',
        guest_email:      guestEmail,
        guest_phone:      req2.guest_phone ?? '',
        check_in:         req2.check_in,
        check_out:        req2.check_out,
        nights:           Number(req2.nights),
        room_name:        propName,
        room_details:     rooms,
        cover_photo_url:  coverPhotoUrl,
        total_amount:     Number(req2.total_amount),
        special_requests: req2.special_requests ?? '',
        admin_email:      process.env.ADMIN_EMAIL ?? '',
      });

      const messages = [
        {
          to:      guestE164,
          message: buildGuestAcceptedSms({
            guestName:    req2.guest_name,
            propertyName: propName,
            checkIn:      req2.check_in,
            checkOut:     req2.check_out,
            total:        Number(req2.total_amount),
            paymentLink:  payment_link,
          }),
        },
        ...(adminPhone ? [{
          to:      adminPhone,
          message: buildAdminConfirmedSms({
            guestName:    req2.guest_name,
            guestPhone:   req2.guest_phone,
            propertyName: propName,
            checkIn:      req2.check_in,
            checkOut:     req2.check_out,
            amount:       Number(req2.total_amount),
            ref:          req2.id,
          }),
        }] : []),
      ];
      sendSmsBulk(messages).catch(err => console.error('[SMS accept]', err));
    }

    if (status === 'declined') {
      sendSmsBulk([{
        to:      guestE164,
        message: buildGuestDeclinedSms({
          guestName:    req2.guest_name,
          propertyName: propName,
          checkIn:      req2.check_in,
          checkOut:     req2.check_out,
          reason:       decline_reason,
          adminPhone:   adminPhone || undefined,
        }),
      }]).catch(err => console.error('[SMS decline]', err));
    }

    return NextResponse.json({ booking: data, guestCreated, bookingCreated, autoError: autoError || undefined });
  } catch (err) {
    console.error('[PATCH /api/requests/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
