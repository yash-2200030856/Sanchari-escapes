-- Add refund tracking fields to transactions and bookings
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'none';

-- Optional: add a flag on bookings for quick lookup
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS refund_processed boolean NOT NULL DEFAULT false;

-- No RLS changes required if existing policies allow updates by admins via service role.
