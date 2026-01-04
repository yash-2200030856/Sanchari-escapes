-- Add refund_requested flag on bookings so users can request a refund upon cancellation
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS refund_requested boolean NOT NULL DEFAULT false;
