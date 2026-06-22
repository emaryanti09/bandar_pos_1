-- Optimasi pencarian produk di kasir.
-- Masalah: query memakai `ilike '%kata%'` (leading wildcard) pada kolom name & barcode.
-- Index B-tree biasa (idx_products_name, idx_products_barcode) TIDAK terpakai untuk
-- pola '%...%', sehingga setiap pencarian melakukan full table scan -> lambat.
--
-- Solusi: extension pg_trgm + index GIN trigram, yang mempercepat ILIKE '%...%'.

create extension if not exists pg_trgm;

-- Index trigram untuk pencarian nama produk (case-insensitive ILIKE)
create index if not exists idx_products_name_trgm
  on products using gin (name gin_trgm_ops);

-- Index trigram untuk pencarian barcode
create index if not exists idx_products_barcode_trgm
  on products using gin (barcode gin_trgm_ops);
