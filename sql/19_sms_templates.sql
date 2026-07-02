-- Migration 19: SMS Templates
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sms_templates (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  body        TEXT NOT NULL,
  variables   TEXT[] DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sms_templates' AND policyname='Anyone can read SMS templates') THEN
    CREATE POLICY "Anyone can read SMS templates"  ON sms_templates FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sms_templates' AND policyname='Anyone can upsert SMS templates') THEN
    CREATE POLICY "Anyone can upsert SMS templates" ON sms_templates FOR ALL USING (true);
  END IF;
END $$;

-- Insert default templates
INSERT INTO sms_templates (key, label, body, variables) VALUES
('booking_request_guest',
 'Booking Request (to Guest)',
 'Hi {{first_name}}! Your booking request for {{property_name}} ({{check_in}} - {{check_out}}, {{nights}} night{{nights_s}}) has been received. Ref: {{ref}}. Our team will confirm within 2 hours. - HostDash',
 ARRAY['first_name','property_name','check_in','check_out','nights','nights_s','ref']),

('booking_request_admin',
 'Booking Request (to Admin)',
 'New booking request! Guest: {{guest_name}} ({{guest_phone}}) Room: {{property_name}} Dates: {{check_in}} - {{check_out}} ({{nights}} night{{nights_s}}) Total: KSh {{total}}. Log in to accept or decline.',
 ARRAY['guest_name','guest_phone','property_name','check_in','check_out','nights','nights_s','total']),

('booking_accepted',
 'Booking Accepted (to Guest)',
 'Great news {{first_name}}! Your booking for {{property_name}} ({{check_in}} - {{check_out}}) has been ACCEPTED. Total: KSh {{total}}.{{payment_line}} - HostDash',
 ARRAY['first_name','property_name','check_in','check_out','total','payment_line']),

('booking_declined',
 'Booking Declined (to Guest)',
 'Hi {{first_name}}, we regret your booking for {{property_name}} ({{check_in}} - {{check_out}}) could not be accommodated.{{reason_line}}{{call_line}} - HostDash',
 ARRAY['first_name','property_name','check_in','check_out','reason_line','call_line']),

('review_request',
 'Review Request (to Guest)',
 'Hi {{first_name}}! Thank you for staying with us. We''d love your feedback - please leave a quick review: {{review_url}} - HostDash',
 ARRAY['first_name','review_url'])

ON CONFLICT (key) DO NOTHING;
