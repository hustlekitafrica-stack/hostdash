<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Environment Variables Reference

### SMS (Twilio — primary provider)

```
SMS_PROVIDER=twilio
SMS_API_KEY=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx        # Twilio Account SID
SMS_USERNAME=your_auth_token                          # Twilio Auth Token
SMS_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxx  # Preferred: Messaging Service SID (add KogeloSuite alphanumeric sender inside it)
SMS_FROM=KogeloSuite                                  # Fallback: used only when SMS_MESSAGING_SERVICE_SID is not set
ADMIN_PHONE=+254700000000                             # Host/admin phone — receives booking notifications
```

### Make.com — AI-personalised email notifications

```
MAKE_WEBHOOK_BOOKING_REQUEST=https://hook.eu2.make.com/xxxxxx   # Fired on new booking request
MAKE_WEBHOOK_BOOKING_CONFIRMED=https://hook.eu2.make.com/xxxxxx # Fired when host accepts a booking
ADMIN_EMAIL=you@example.com                                      # Admin email — forwarded in both payloads
```

Booking request scenario:  Webhook → Email to guest (request received) → Email to admin (new request).
Booking confirmed scenario: Webhook → Email to guest (booking confirmed) → Email to admin (booking confirmed).
If either webhook env var is absent, that call is silently skipped.

### PesaPal — Platform subscription payments

```
PESAPAL_CONSUMER_KEY=your_consumer_key          # From PesaPal merchant dashboard → API Keys
PESAPAL_CONSUMER_SECRET=your_consumer_secret    # From PesaPal merchant dashboard → API Keys
PESAPAL_IPN_ID=your_ipn_id                      # Register IPN URL in PesaPal dashboard → IPN Manager
                                                 # IPN URL to register: https://yourdomain.com/api/pesapal/ipn
NEXT_PUBLIC_APP_URL=https://yourdomain.com       # Used to build callback & IPN URLs (no trailing slash)
```

One-time charge: $45 USD (≈ KSh 6,000). Supports Visa, Mastercard, M-Pesa, Airtel Money.
On payment confirmation PesaPal POSTs to `/api/pesapal/ipn` → sets `profiles.subscription_status = 'paid'`.

### SMS (Africa's Talking — legacy, kept for reference)

```
SMS_PROVIDER=africastalking
SMS_API_KEY=<AT API key>
SMS_USERNAME=<AT username>
SMS_SENDER_ID=<AT sender name/number>
```
