-- Tambah field kode (SKU) ke tabel products
ALTER TABLE products ADD COLUMN IF NOT EXISTS kode text unique;
CREATE INDEX IF NOT EXISTS idx_products_kode ON products(kode);
