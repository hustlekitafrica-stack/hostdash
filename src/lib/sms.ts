/**
 * SMS utility — provider-agnostic stub.
 *
 * To activate real SMS delivery set these env vars:
 *   SMS_PROVIDER              = "twilio" | "africastalking"
 *
 *   -- Twilio (primary) --
 *   SMS_API_KEY               = <Twilio Account SID  (ACxxx...)>
 *   SMS_USERNAME              = <Twilio Auth Token>
 *   SMS_MESSAGING_SERVICE_SID = <Twilio Messaging Service SID (MGxxx...)>  ← preferred for Kenya alphanumeric sender
 *   SMS_FROM                  = <Alphanumeric sender ID or Twilio phone number>  ← used only when no Messaging Service SID
 *
 *   -- Africa's Talking (legacy) --
 *   SMS_API_KEY               = <AT API key>
 *   SMS_USERNAME              = <AT username>
 *   SMS_SENDER_ID             = <AT sender name/number>
 *
 *   ADMIN_PHONE               = <host/admin phone number e.g. +254700000000>
 */

/** Normalise a Kenyan phone number to E.164 (+254XXXXXXXXX). Leaves other formats unchanged. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10)  return '+254' + digits.slice(1);
  if (digits.startsWith('254') && digits.length === 12) return '+' + digits;
  if (raw.startsWith('+'))                              return raw.trim();
  return raw.trim();
}

export interface SmsResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/** Send an SMS to one recipient. Falls back to console.log when no provider is configured. */
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const provider = process.env.SMS_PROVIDER;

  if (provider === 'africastalking') {
    return sendViaAfricasTalking(to, message);
  }
  if (provider === 'twilio') {
    return sendViaTwilio(to, message);
  }

  // Stub — log and return success so the rest of the flow is not blocked
  console.log(`[SMS STUB] To: ${to}\nMessage: ${message}\n`);
  return { ok: true, messageId: `stub_${Date.now()}` };
}

/** Convenience: send to multiple recipients in parallel */
export async function sendSmsBulk(
  recipients: { to: string; message: string }[]
): Promise<SmsResult[]> {
  return Promise.all(recipients.map(({ to, message }) => sendSms(to, message)));
}

// ── Africa's Talking ────────────────────────────────────────────────────────
async function sendViaAfricasTalking(to: string, message: string): Promise<SmsResult> {
  try {
    const apiKey   = process.env.SMS_API_KEY ?? '';
    const username = process.env.SMS_USERNAME ?? 'sandbox';
    const from     = process.env.SMS_SENDER_ID ?? '';
    const url      = username === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';

    const body = new URLSearchParams({ username, to, message, ...(from ? { from } : {}) });
    const res  = await fetch(url, {
      method:  'POST',
      headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { return { ok: false, error: `AT returned non-JSON (${res.status}): ${text.slice(0, 120)}` }; }
    const recipient = data?.SMSMessageData?.Recipients?.[0];
    if (recipient?.status === 'Success') return { ok: true, messageId: recipient.messageId };
    return { ok: false, error: recipient?.status ?? data?.error ?? 'Unknown AT error' };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ── Twilio ──────────────────────────────────────────────────────────────────
async function sendViaTwilio(to: string, message: string): Promise<SmsResult> {
  try {
    const sid        = process.env.SMS_API_KEY ?? '';
    const token      = process.env.SMS_USERNAME ?? '';
    const msgSvcSid  = process.env.SMS_MESSAGING_SERVICE_SID ?? '';
    const from       = process.env.SMS_FROM ?? '';
    const url        = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

    const body = new URLSearchParams({ To: to, Body: message });
    if (msgSvcSid) {
      body.set('MessagingServiceSid', msgSvcSid);
    } else {
      body.set('From', from);
    }

    const res = await fetch(url, {
      method:  'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    const data = await res.json();
    if (data.sid) return { ok: true, messageId: data.sid };
    return { ok: false, error: data.message ?? 'Twilio error' };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ── Message templates ───────────────────────────────────────────────────────

export function buildGuestRequestSms(opts: {
  guestName: string; propertyName: string;
  checkIn: string; checkOut: string; nights: number; ref: string;
}): string {
  const { guestName, propertyName, checkIn, checkOut, nights, ref } = opts;
  const first = guestName.split(' ')[0];
  return `Hi ${first}! 🏨 Your booking request for ${propertyName} (${checkIn} – ${checkOut}, ${nights} night${nights !== 1 ? 's' : ''}) has been received. Ref: ${ref.slice(0,8).toUpperCase()}. We will get back to you within 5 minutes. – HostDash`;
}

export function buildAdminRequestSms(opts: {
  guestName: string; guestPhone: string; propertyName: string;
  checkIn: string; checkOut: string; nights: number; total: number;
}): string {
  const { guestName, guestPhone, propertyName, checkIn, checkOut, nights, total } = opts;
  return `📬 New booking request!\nGuest: ${guestName} (${guestPhone})\nRoom: ${propertyName}\nDates: ${checkIn} – ${checkOut} (${nights} night${nights !== 1 ? 's' : ''})\nTotal: KSh ${total.toLocaleString()}\nLog in to accept or decline.`;
}

export function buildGuestAcceptedSms(opts: {
  guestName: string; propertyName: string;
  checkIn: string; checkOut: string; total: number; paymentLink?: string;
}): string {
  const { guestName, propertyName, checkIn, checkOut, total, paymentLink } = opts;
  const first = guestName.split(' ')[0];
  const payLine = paymentLink ? `\nPay here to confirm: ${paymentLink}` : '';
  return `Great news ${first}! ✅ Your booking request for ${propertyName} (${checkIn} – ${checkOut}) has been ACCEPTED. To confirm your reservation, please make a full payment of KSh ${total.toLocaleString()}.${payLine} – HostDash`;
}

export function buildGuestDeclinedSms(opts: {
  guestName: string; propertyName: string;
  checkIn: string; checkOut: string; reason?: string; adminPhone?: string;
}): string {
  const { guestName, propertyName, checkIn, checkOut, reason, adminPhone } = opts;
  const first   = guestName.split(' ')[0];
  const why     = reason ? ` Reason: ${reason}.` : '';
  const callUs  = adminPhone ? ` Call us on ${adminPhone} to explore alternatives.` : '';
  return `Hi ${first}, we regret to inform you that your booking request for ${propertyName} (${checkIn} – ${checkOut}) could not be accommodated.${why}${callUs} – HostDash`;
}

export function buildGuestConfirmedSms(opts: {
  guestName: string; propertyName: string;
  checkIn: string; checkOut: string; nights: number;
  total: number; ref: string;
}): string {
  const { guestName, propertyName, checkIn, checkOut, nights, total, ref } = opts;
  const first = guestName.split(' ')[0];
  return `🎉 Booking Confirmed, ${first}!\nProperty: ${propertyName}\nCheck-in: ${checkIn}  |  Check-out: ${checkOut} (${nights} nights)\nTotal Paid: KSh ${total.toLocaleString()}\nRef: ${ref.slice(0,8).toUpperCase()}\n💯 Fully refundable if cancelled 48h+ before check-in.\nWe look forward to hosting you! – HostDash`;
}

export function buildAdminConfirmedSms(opts: {
  guestName: string; guestPhone: string; propertyName: string;
  checkIn: string; checkOut: string; amount: number; ref: string;
}): string {
  const { guestName, guestPhone, propertyName, checkIn, checkOut, amount, ref } = opts;
  return `💳 Payment received!\nGuest: ${guestName} (${guestPhone})\nRoom: ${propertyName}\nDates: ${checkIn} – ${checkOut}\nAmount: KSh ${amount.toLocaleString()}\nRef: ${ref.slice(0,8).toUpperCase()}\nBooking is now CONFIRMED.`;
}
