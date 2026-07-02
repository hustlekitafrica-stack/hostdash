const PESAPAL_BASE = 'https://pay.pesapal.com/v3';

const CONSUMER_KEY    = process.env.PESAPAL_CONSUMER_KEY!;
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET!;
const IPN_ID          = process.env.PESAPAL_IPN_ID!;
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ── Token cache (module-level, reused within the same serverless instance) ──
let _token: string | null = null;
let _tokenExpiresAt = 0;

export async function getPesapalToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiresAt) return _token;

  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PesaPal auth failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { token: string; expiryDate: string };
  _token = data.token;
  _tokenExpiresAt = new Date(data.expiryDate).getTime() - 60_000;
  return _token;
}

export interface SubmitOrderInput {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
}

export interface SubmitOrderResult {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
}

export async function submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
  const token = await getPesapalToken();

  const payload = {
    id:              input.orderId,
    currency:        input.currency,
    amount:          input.amount,
    description:     input.description,
    callback_url:    `${APP_URL}/upgrade/callback`,
    notification_id: IPN_ID,
    billing_address: {
      email_address: input.emailAddress,
      phone_number:  input.phoneNumber ?? '',
      first_name:    input.firstName,
      last_name:     input.lastName,
    },
  };

  const res = await fetch(`${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PesaPal submitOrder failed (${res.status}): ${text}`);
  }

  const data = await res.json() as SubmitOrderResult & { status?: string; error?: { message: string } };
  if (data.error) throw new Error(`PesaPal submitOrder error: ${data.error.message}`);

  return data;
}

export interface TransactionStatus {
  payment_method:       string;
  amount:               number;
  created_date:         string;
  confirmation_code:    string;
  payment_status_description: string;
  description:          string;
  message:              string;
  order_tracking_id:    string;
  merchant_reference:   string;
  payment_account:      string;
  call_back_url:        string;
  status_code:          number;
  currency:             string;
}

export async function getTransactionStatus(orderTrackingId: string): Promise<TransactionStatus> {
  const token = await getPesapalToken();

  const res = await fetch(
    `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PesaPal getTransactionStatus failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<TransactionStatus>;
}

export const PESAPAL_PAID_STATUS = 'Completed';
