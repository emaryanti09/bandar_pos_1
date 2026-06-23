-- Fix generate_invoice_no:
-- 1. Pakai max sequence (bukan count) agar tidak duplikat jika data dihapus
-- 2. Pakai timezone Asia/Jakarta (UTC+7) agar tanggal invoice sesuai WIB
create or replace function generate_invoice_no()
returns text as $$
declare
  today text;
  seq int;
  inv text;
begin
  today := to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD');

  select coalesce(
    max(
      cast(
        substring(invoice_no from 'INV-[0-9]+-([0-9]+)$')
        as integer
      )
    ), 0
  ) + 1
  into seq
  from transactions
  where invoice_no like 'INV-' || today || '-%';

  inv := 'INV-' || today || '-' || lpad(seq::text, 4, '0');
  return inv;
end;
$$ language plpgsql;
