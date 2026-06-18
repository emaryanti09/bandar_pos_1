-- Add expired_at to stock_movements for per-batch expiry tracking
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS expired_at date;
