-- ============================================================
-- BANDAR POS - Initial Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE: store_settings
-- ============================================================
create table store_settings (
  id uuid primary key default uuid_generate_v4(),
  store_name text not null default 'Bandar POS',
  whatsapp text,
  address text,
  footer_note text default 'Terima kasih telah berbelanja!',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into store_settings (store_name, whatsapp, address, footer_note)
values ('Bandar POS', '08123456789', 'Jl. Contoh No. 1', 'Terima kasih telah berbelanja!');

-- ============================================================
-- TABLE: profiles (extends auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('admin', 'kasir')) default 'kasir',
  active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLE: products
-- ============================================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  barcode text unique,
  name text not null,
  unit text not null default 'pcs',       -- satuan besar: dus, karton
  unit_small text,                          -- satuan kecil: pcs, biji
  unit_conversion int default 1,            -- 1 dus = 12 pcs
  price decimal(15,2) not null default 0,   -- harga jual satuan kecil
  stock int not null default 0,
  stock_min int not null default 5,
  expired_at date,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_products_barcode on products(barcode);
create index idx_products_name on products(name);
create index idx_products_active on products(active);

-- ============================================================
-- TABLE: transactions
-- ============================================================
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  invoice_no text unique not null,
  cashier_id uuid references profiles(id),
  payment_method text not null check (payment_method in ('cash', 'qris')),
  subtotal decimal(15,2) not null default 0,
  discount decimal(15,2) not null default 0,
  total decimal(15,2) not null default 0,
  paid decimal(15,2) not null default 0,
  change decimal(15,2) not null default 0,
  note text,
  created_at timestamptz default now()
);

create index idx_transactions_created_at on transactions(created_at desc);
create index idx_transactions_cashier on transactions(cashier_id);
create index idx_transactions_invoice on transactions(invoice_no);

-- ============================================================
-- TABLE: transaction_items
-- ============================================================
create table transaction_items (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,
  product_barcode text,
  unit text not null,
  price decimal(15,2) not null,
  quantity int not null,
  subtotal decimal(15,2) not null,
  created_at timestamptz default now()
);

create index idx_transaction_items_transaction on transaction_items(transaction_id);
create index idx_transaction_items_product on transaction_items(product_id);

-- ============================================================
-- TABLE: stock_movements
-- ============================================================
create table stock_movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id),
  type text not null check (type in ('sale', 'opname', 'adjustment', 'open_pack')),
  qty_before int not null,
  qty_change int not null,  -- negatif = keluar
  qty_after int not null,
  note text,
  reference_id uuid,        -- transaction_id jika type=sale
  user_id uuid references profiles(id),
  created_at timestamptz default now()
);

create index idx_stock_movements_product on stock_movements(product_id);
create index idx_stock_movements_created_at on stock_movements(created_at desc);

-- ============================================================
-- FUNCTION: auto-update updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_products_updated_at
  before update on products
  for each row execute function update_updated_at();

create trigger trg_store_settings_updated_at
  before update on store_settings
  for each row execute function update_updated_at();

-- ============================================================
-- FUNCTION: generate invoice number
-- ============================================================
create or replace function generate_invoice_no()
returns text as $$
declare
  today text;
  seq int;
  inv text;
begin
  today := to_char(now(), 'YYYYMMDD');
  select count(*) + 1 into seq
  from transactions
  where date(created_at) = current_date;
  inv := 'INV-' || today || '-' || lpad(seq::text, 4, '0');
  return inv;
end;
$$ language plpgsql;

-- ============================================================
-- FUNCTION: process sale (atomic transaction + stock deduct)
-- ============================================================
create or replace function process_sale(
  p_cashier_id uuid,
  p_payment_method text,
  p_subtotal decimal,
  p_discount decimal,
  p_total decimal,
  p_paid decimal,
  p_change decimal,
  p_note text,
  p_items jsonb
)
returns uuid as $$
declare
  v_transaction_id uuid;
  v_invoice_no text;
  v_item jsonb;
  v_qty_before int;
begin
  v_invoice_no := generate_invoice_no();

  insert into transactions (invoice_no, cashier_id, payment_method, subtotal, discount, total, paid, change, note)
  values (v_invoice_no, p_cashier_id, p_payment_method, p_subtotal, p_discount, p_total, p_paid, p_change, p_note)
  returning id into v_transaction_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into transaction_items (transaction_id, product_id, product_name, product_barcode, unit, price, quantity, subtotal)
    values (
      v_transaction_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      v_item->>'product_barcode',
      v_item->>'unit',
      (v_item->>'price')::decimal,
      (v_item->>'quantity')::int,
      (v_item->>'subtotal')::decimal
    );

    select stock into v_qty_before from products where id = (v_item->>'product_id')::uuid;

    update products
    set stock = stock - (v_item->>'quantity')::int
    where id = (v_item->>'product_id')::uuid;

    insert into stock_movements (product_id, type, qty_before, qty_change, qty_after, note, reference_id, user_id)
    values (
      (v_item->>'product_id')::uuid,
      'sale',
      v_qty_before,
      -((v_item->>'quantity')::int),
      v_qty_before - (v_item->>'quantity')::int,
      'Penjualan ' || v_invoice_no,
      v_transaction_id,
      p_cashier_id
    );
  end loop;

  return v_transaction_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FUNCTION: open pack (buka bungkus)
-- ============================================================
create or replace function open_pack(
  p_product_id uuid,
  p_user_id uuid,
  p_qty_packs int
)
returns void as $$
declare
  v_product products%rowtype;
  v_qty_before int;
  v_qty_add int;
begin
  select * into v_product from products where id = p_product_id;

  if v_product.unit_conversion is null or v_product.unit_conversion <= 1 then
    raise exception 'Produk tidak memiliki konversi unit';
  end if;

  v_qty_before := v_product.stock;
  v_qty_add := p_qty_packs * v_product.unit_conversion;

  update products set stock = stock + v_qty_add where id = p_product_id;

  insert into stock_movements (product_id, type, qty_before, qty_change, qty_after, note, user_id)
  values (p_product_id, 'open_pack', v_qty_before, v_qty_add,
          v_qty_before + v_qty_add,
          'Buka bungkus ' || p_qty_packs || ' ' || v_product.unit, p_user_id);
end;
$$ language plpgsql security definer;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table products enable row level security;
alter table transactions enable row level security;
alter table transaction_items enable row level security;
alter table stock_movements enable row level security;
alter table store_settings enable row level security;

-- profiles
create policy "Users can view all profiles" on profiles for select to authenticated using (true);
create policy "Users can update own profile" on profiles for update to authenticated using (auth.uid() = id);
create policy "Service role can insert profiles" on profiles for insert with check (true);

-- products - semua authenticated bisa baca, hanya admin yg write
create policy "Authenticated can read products" on products for select to authenticated using (true);
create policy "Admin can insert products" on products for insert to authenticated with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin can update products" on products for update to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin can delete products" on products for delete to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- transactions - semua authenticated bisa baca & insert
create policy "Authenticated can read transactions" on transactions for select to authenticated using (true);
create policy "Authenticated can insert transactions" on transactions for insert to authenticated with check (true);

-- transaction_items
create policy "Authenticated can read transaction_items" on transaction_items for select to authenticated using (true);
create policy "Authenticated can insert transaction_items" on transaction_items for insert to authenticated with check (true);

-- stock_movements
create policy "Authenticated can read stock_movements" on stock_movements for select to authenticated using (true);
create policy "Authenticated can insert stock_movements" on stock_movements for insert to authenticated with check (true);

-- store_settings
create policy "Authenticated can read store_settings" on store_settings for select to authenticated using (true);
create policy "Admin can update store_settings" on store_settings for update to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'kasir')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
