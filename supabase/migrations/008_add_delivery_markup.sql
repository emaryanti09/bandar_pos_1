ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS delivery_price_markup integer NOT NULL DEFAULT 0;
