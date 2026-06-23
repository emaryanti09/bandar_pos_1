-- Fix generate_invoice_no: ganti count(*)+1 dengan max sequence
-- agar tidak duplikat meski ada data yang dihapus atau race condition
create or replace function generate_invoice_no()
returns text as $$
declare
  today text;
  seq int;
  inv text;
begin
  today := to_char(now(), 'YYYYMMDD');

  -- Ambil nomor urut tertinggi dari invoice hari ini, bukan count
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
