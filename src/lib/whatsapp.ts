/**
 * WhatsApp Business utility — sends messages via the Twilio WhatsApp API.
 *
 * Reuses the existing Twilio credentials (SMS_API_KEY / SMS_USERNAME)
 * and adds a dedicated WhatsApp sender number.
 *
 * Required env vars:
 *   SMS_API_KEY           = <Twilio Account SID  (ACxxx...)>
 *   SMS_USERNAME          = <Twilio Auth Token>
 *   WHATSAPP_FROM         = whatsapp:+14155238886   (Twilio sandbox or your approved WhatsApp number)
 *
 * Falls back to a console stub when WHATSAPP_FROM is not set.
 */

import { normalizePhone, type SmsResult } from './sms';

/**
 * Ensure number is in WhatsApp format: whatsapp:+2547XXXXXXXX
 */
function toWhatsAppAddress(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.startsWith('whatsapp:')) return normalized;
  return `whatsapp:${normalized}`;
}

/**
 * Send a single WhatsApp message via Twilio.
 */
export async function sendWhatsApp(
  to: string,
  message: string,
): Promise<SmsResult> {
  const from = process.env.WHATSAPP_FROM ?? '';

  if (!from) {
    console.log(`[WhatsApp STUB] To: ${to}\nMessage: ${message}\n`);
    return { ok: true, messageId: `wa_stub_${Date.now()}` };
  }

  const sid   = process.env.SMS_API_KEY ?? '';
  const token = process.env.SMS_USERNAME ?? '';

  if (!sid || !token) {
    return { ok: false, error: 'Missing Twilio credentials (SMS_API_KEY / SMS_USERNAME)' };
  }

  try {
    const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const body = new URLSearchParams({
      To:   toWhatsAppAddress(to),
      From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
      Body: message,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await res.json();
    if (data.sid) return { ok: true, messageId: data.sid };
    return { ok: false, error: data.message ?? 'Twilio WhatsApp error' };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Send WhatsApp messages to multiple recipients in parallel.
 */
export async function sendWhatsAppBulk(
  recipients: { to: string; message: string }[],
): Promise<SmsResult[]> {
  return Promise.all(recipients.map(({ to, message }) => sendWhatsApp(to, message)));
}

// ── WhatsApp message builders (mirror the SMS ones) ──────────────────────────

export function buildGuestBookingConfirmedWA(opts: {
  guestName: string; propertyName: string;
  checkIn: string; checkOut: string; nights: number;
  total: number; ref: string;
}): string {
  const { guestName, propertyName, checkIn, checkOut, nights, total, ref } = opts;
  const first = guestName.split(' ')[0];
  return [
    `🎉 *Booking Confirmed*, ${first}!`,
    '',
    `🏠 *Property:* ${propertyName}`,
    `📅 *Check-in:* ${checkIn}`,
    `📅 *Check-out:* ${checkOut} (${nights} night${nights !== 1 ? 's' : ''})`,
    `💰 *Total:* KSh ${total.toLocaleString()}`,
    `🔖 *Ref:* ${ref.slice(0, 8).toUpperCase()}`,
    '',
    '💯 Fully refundable if cancelled 48h+ before check-in.',
    'We look forward to hosting you! — HostDash',
  ].join('\n');
}

export function buildAdminBookingConfirmedWA(opts: {
  guestName: string; guestPhone: string; propertyName: string;
  checkIn: string; checkOut: string; amount: number; ref: string;
}): string {
  const { guestName, guestPhone, propertyName, checkIn, checkOut, amount, ref } = opts;
  return [
    '💳 *Payment Received*',
    '',
    `👤 *Guest:* ${guestName} (${guestPhone})`,
    `🏠 *Property:* ${propertyName}`,
    `📅 *Dates:* ${checkIn} – ${checkOut}`,
    `💰 *Amount:* KSh ${amount.toLocaleString()}`,
    `🔖 *Ref:* ${ref.slice(0, 8).toUpperCase()}`,
    '',
    'Booking is now *CONFIRMED*.',
  ].join('\n');
}

export function buildGuestRequestWA(opts: {
  guestName: string; propertyName: string;
  checkIn: string; checkOut: string; nights: number; ref: string;
}): string {
  const { guestName, propertyName, checkIn, checkOut, nights, ref } = opts;
  const first = guestName.split(' ')[0];
  return [
    `Hi ${first}! 🏨`,
    '',
    `Your booking request for *${propertyName}* has been received.`,
    `📅 ${checkIn} – ${checkOut} (${nights} night${nights !== 1 ? 's' : ''})`,
    `🔖 Ref: ${ref.slice(0, 8).toUpperCase()}`,
    '',
    'We will get back to you within 5 minutes. — HostDash',
  ].join('\n');
}

export function buildAdminRequestWA(opts: {
  guestName: string; guestPhone: string; propertyName: string;
  checkIn: string; checkOut: string; nights: number; total: number;
}): string {
  const { guestName, guestPhone, propertyName, checkIn, checkOut, nights, total } = opts;
  return [
    '📬 *New Booking Request*',
    '',
    `👤 *Guest:* ${guestName} (${guestPhone})`,
    `🏠 *Room:* ${propertyName}`,
    `📅 *Dates:* ${checkIn} – ${checkOut} (${nights} night${nights !== 1 ? 's' : ''})`,
    `💰 *Total:* KSh ${total.toLocaleString()}`,
    '',
    'Log in to accept or decline.',
  ].join('\n');
}
