-- HostBooks KE - Phase 1 Storage & Seed Data
-- Run this after 02_rls_policies.sql

-- ============================================================================
-- STORAGE BUCKET SETUP (via Supabase Dashboard)
-- ============================================================================
-- Note: Storage buckets must be created via Supabase Dashboard
-- Create a public bucket named "property-photos"
-- Add the following policy:
--
-- CREATE POLICY "Allow authenticated users to upload to their folder"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'property-photos' AND
--     auth.role() = 'authenticated' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- CREATE POLICY "Allow public read access"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'property-photos');

-- ============================================================================
-- SEED DEFAULT CATEGORIES FOR NEW USERS
-- ============================================================================

-- Function to seed default categories when a user signs up
CREATE OR REPLACE FUNCTION seed_user_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default income categories (non-fatal)
  BEGIN
    INSERT INTO income_categories (user_id, name, is_default, icon, color, sort_order)
    VALUES
      (NEW.id, 'Short Stay Rental', true, '🏠', '#0f766e', 1),
      (NEW.id, 'Long Stay Rental', true, '📅', '#0f766e', 2),
      (NEW.id, 'Security Deposit Kept', true, '🔒', '#d97706', 3),
      (NEW.id, 'Cleaning Fee', true, '🧹', '#0f766e', 4),
      (NEW.id, 'Early Check-in Fee', true, '⏰', '#0f766e', 5),
      (NEW.id, 'Late Check-out Fee', true, '⏰', '#0f766e', 6),
      (NEW.id, 'Extra Guest Fee', true, '👥', '#0f766e', 7),
      (NEW.id, 'Airport Pickup', true, '🚗', '#0f766e', 8),
      (NEW.id, 'Laundry Services', true, '🧺', '#0f766e', 9),
      (NEW.id, 'Other Services', true, '⭐', '#0f766e', 10);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Insert default expense categories (non-fatal)
  BEGIN
    INSERT INTO expense_categories (user_id, name, is_default, icon, color, sort_order)
    VALUES
      (NEW.id, 'Caretaker/Housekeeper Salary', true, '👤', '#ef4444', 1),
      (NEW.id, 'Cleaning Supplies', true, '🧹', '#ef4444', 2),
      (NEW.id, 'Internet/WiFi Bill', true, '📡', '#ef4444', 3),
      (NEW.id, 'Electricity Bill', true, '⚡', '#ef4444', 4),
      (NEW.id, 'Water Bill', true, '💧', '#ef4444', 5),
      (NEW.id, 'DSTV/Netflix Subscription', true, '📺', '#ef4444', 6),
      (NEW.id, 'Property Maintenance & Repairs', true, '🔧', '#ef4444', 7),
      (NEW.id, 'Airbnb/Booking.com Commission', true, '💳', '#ef4444', 8),
      (NEW.id, 'Furnishings & Appliances', true, '🛋️', '#ef4444', 9),
      (NEW.id, 'Toiletries & Consumables', true, '🧴', '#ef4444', 10),
      (NEW.id, 'Security/Guard Services', true, '🔐', '#ef4444', 11),
      (NEW.id, 'Property Insurance', true, '🛡️', '#ef4444', 12),
      (NEW.id, 'Service Charge/Strata Fee', true, '🏢', '#ef4444', 13),
      (NEW.id, 'Laundry', true, '🧺', '#ef4444', 14),
      (NEW.id, 'Refunds to Guests', true, '↩️', '#ef4444', 15),
      (NEW.id, 'Marketing & Photography', true, '📸', '#ef4444', 16),
      (NEW.id, 'Accountant/Legal Fees', true, '⚖️', '#ef4444', 17),
      (NEW.id, 'Other', true, '⭐', '#ef4444', 18);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run seed function when user signs up (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION seed_user_defaults();

-- ============================================================================
-- RPC FUNCTION: Recalculate Unit Monthly Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_unit_stats(
  p_property_id UUID, p_year INTEGER, p_month INTEGER
) RETURNS void AS $$
DECLARE
  v_days_in_month INTEGER := DATE_PART('days', 
    DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1)) + INTERVAL '1 month - 1 day')::INTEGER;
  v_blocked_nights INTEGER := 0;
  v_booked_nights INTEGER := 0;
  v_total_revenue DECIMAL(10, 2) := 0;
  v_total_bookings INTEGER := 0;
  v_total_guests INTEGER := 0;
  v_avg_stay DECIMAL(5, 2) := 0;
  v_user_id UUID;
BEGIN
  -- Get user_id for this property
  SELECT user_id INTO v_user_id FROM properties WHERE id = p_property_id;

  -- Calculate blocked nights (excluding maintenance)
  SELECT COALESCE(SUM((end_date - start_date)::INTEGER), 0)
  INTO v_blocked_nights
  FROM blocked_dates
  WHERE property_id = p_property_id
    AND EXTRACT(YEAR FROM start_date) = p_year
    AND EXTRACT(MONTH FROM start_date) = p_month;

  -- Calculate booked nights and revenue from bookings
  SELECT 
    COALESCE(SUM(nights), 0),
    COALESCE(SUM(total_amount), 0),
    COUNT(*),
    COALESCE(SUM(num_adults + num_children), 0),
    COALESCE(AVG(nights), 0)
  INTO v_booked_nights, v_total_revenue, v_total_bookings, v_total_guests, v_avg_stay
  FROM bookings
  WHERE property_id = p_property_id
    AND EXTRACT(YEAR FROM check_in) = p_year
    AND EXTRACT(MONTH FROM check_in) = p_month
    AND status NOT IN ('cancelled', 'no_show');

  -- Insert or update unit_monthly_stats
  INSERT INTO unit_monthly_stats (
    property_id, user_id, year, month,
    total_revenue, total_bookings, booked_nights,
    available_nights, occupancy_rate, adr, revpar,
    avg_stay_length, total_guests, updated_at
  )
  VALUES (
    p_property_id,
    v_user_id,
    p_year,
    p_month,
    v_total_revenue,
    v_total_bookings,
    v_booked_nights,
    v_days_in_month - v_blocked_nights,
    CASE WHEN (v_days_in_month - v_blocked_nights) > 0 
      THEN (v_booked_nights::REAL / (v_days_in_month - v_blocked_nights) * 100)::DECIMAL(5, 2)
      ELSE 0 END,
    CASE WHEN v_booked_nights > 0 
      THEN (v_total_revenue / v_booked_nights)::DECIMAL(10, 2)
      ELSE 0 END,
    CASE WHEN (v_days_in_month - v_blocked_nights) > 0
      THEN (v_total_revenue / (v_days_in_month - v_blocked_nights))::DECIMAL(10, 2)
      ELSE 0 END,
    v_avg_stay,
    v_total_guests,
    NOW()
  )
  ON CONFLICT (property_id, year, month) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_bookings = EXCLUDED.total_bookings,
    booked_nights = EXCLUDED.booked_nights,
    available_nights = EXCLUDED.available_nights,
    occupancy_rate = EXCLUDED.occupancy_rate,
    adr = EXCLUDED.adr,
    revpar = EXCLUDED.revpar,
    avg_stay_length = EXCLUDED.avg_stay_length,
    total_guests = EXCLUDED.total_guests,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Auto-recalculate stats when booking is created/updated/deleted
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_recalculate_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT and UPDATE, use NEW record
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM recalculate_unit_stats(NEW.property_id, EXTRACT(YEAR FROM NEW.check_in)::INTEGER, EXTRACT(MONTH FROM NEW.check_in)::INTEGER);
  END IF;
  
  -- For DELETE, use OLD record
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_unit_stats(OLD.property_id, EXTRACT(YEAR FROM OLD.check_in)::INTEGER, EXTRACT(MONTH FROM OLD.check_in)::INTEGER);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER booking_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_stats();

-- ============================================================================
-- TRIGGER: Log audit trail for bookings
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_audit_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (NEW.user_id, 'CREATE', 'booking', NEW.id, row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (NEW.user_id, 'UPDATE', 'booking', NEW.id, row_to_json(OLD), row_to_json(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values)
    VALUES (OLD.user_id, 'DELETE', 'booking', OLD.id, row_to_json(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_booking_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_booking();

-- ============================================================================
-- TRIGGER: Log audit trail for payments
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_audit_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (NEW.user_id, 'CREATE', 'payment', NEW.id, row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (NEW.user_id, 'UPDATE', 'payment', NEW.id, row_to_json(OLD), row_to_json(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values)
    VALUES (OLD.user_id, 'DELETE', 'payment', OLD.id, row_to_json(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_payment_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payment_logs
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_payment();

-- ============================================================================
-- TRIGGER: Log audit trail for expenses
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_audit_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (NEW.user_id, 'CREATE', 'expense', NEW.id, row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (NEW.user_id, 'UPDATE', 'expense', NEW.id, row_to_json(OLD), row_to_json(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values)
    VALUES (OLD.user_id, 'DELETE', 'expense', OLD.id, row_to_json(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_expense_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_expense();
