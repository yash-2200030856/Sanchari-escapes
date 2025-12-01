-- Migration: add booking_id to transactions so the app can attach transactions to bookings
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;

-- ensure RLS policy still allows inserts from authenticated users (the existing policies check user_id)
-- nothing else required unless you want a policy enforcing booking ownership.
