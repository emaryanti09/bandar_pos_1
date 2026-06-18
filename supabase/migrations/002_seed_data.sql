-- ============================================================
-- BANDAR POS - Seed Data
-- ============================================================
-- Jalankan SETELAH 001_initial_schema.sql
-- Gunakan Supabase Dashboard > SQL Editor untuk menjalankan ini
--
-- CATATAN: User harus dibuat via Supabase Auth Dashboard atau API.
-- Script ini menyiapkan profiles + data setelah auth user dibuat.
-- Lihat bagian bawah file untuk instruksi lengkap.
-- ============================================================

-- ============================================================
-- STEP 1: Buat Auth Users via Supabase Dashboard
-- ============================================================
-- Buka Supabase Dashboard > Authentication > Users > Add User
--
-- User 1 - Admin:
--   Email    : admin@bandarpos.com
--   Password : Admin123!
--
-- User 2 - Kasir:
--   Email    : kasir@bandarpos.com
--   Password : Kasir123!
--
-- User 3 - Kasir 2:
--   Email    : kasir2@bandarpos.com
--   Password : Kasir123!
--
-- Setelah membuat auth user, salin UUID mereka dan jalankan STEP 2.
-- ============================================================

-- ============================================================
-- STEP 2: Seed menggunakan DO block (jalankan di SQL Editor)
-- ============================================================
-- Script ini menggunakan supabase_admin untuk bypass RLS.
-- Pastikan menjalankan sebagai service_role / postgres.

DO $$
DECLARE
  v_admin_id    uuid;
  v_kasir_id    uuid;
  v_kasir2_id   uuid;

  -- Product IDs
  v_prod_indomie     uuid := uuid_generate_v4();
  v_prod_aqua        uuid := uuid_generate_v4();
  v_prod_teh_botol   uuid := uuid_generate_v4();
  v_prod_beras       uuid := uuid_generate_v4();
  v_prod_minyak      uuid := uuid_generate_v4();
  v_prod_gula        uuid := uuid_generate_v4();
  v_prod_kopi        uuid := uuid_generate_v4();
  v_prod_susu        uuid := uuid_generate_v4();
  v_prod_rokok       uuid := uuid_generate_v4();
  v_prod_sabun       uuid := uuid_generate_v4();

  -- Transaction IDs
  v_trx1 uuid := uuid_generate_v4();
  v_trx2 uuid := uuid_generate_v4();
  v_trx3 uuid := uuid_generate_v4();
  v_trx4 uuid := uuid_generate_v4();
  v_trx5 uuid := uuid_generate_v4();

BEGIN

  -- ----------------------------------------------------------
  -- Ambil atau buat auth users
  -- Jika belum ada, buat via Supabase auth.users langsung
  -- ----------------------------------------------------------

  -- Cek apakah admin sudah ada
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@bandarpos.com';
  IF v_admin_id IS NULL THEN
    v_admin_id := uuid_generate_v4();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at,
      aud, role
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@bandarpos.com',
      crypt('Admin123!', gen_salt('bf')),
      now(),
      '{"full_name": "Admin Bandar", "role": "admin"}'::jsonb,
      now(), now(),
      'authenticated', 'authenticated'
    );
  END IF;

  -- Cek apakah kasir sudah ada
  SELECT id INTO v_kasir_id FROM auth.users WHERE email = 'kasir@bandarpos.com';
  IF v_kasir_id IS NULL THEN
    v_kasir_id := uuid_generate_v4();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at,
      aud, role
    ) VALUES (
      v_kasir_id,
      '00000000-0000-0000-0000-000000000000',
      'kasir@bandarpos.com',
      crypt('Kasir123!', gen_salt('bf')),
      now(),
      '{"full_name": "Siti Kasir", "role": "kasir"}'::jsonb,
      now(), now(),
      'authenticated', 'authenticated'
    );
  END IF;

  -- Cek apakah kasir2 sudah ada
  SELECT id INTO v_kasir2_id FROM auth.users WHERE email = 'kasir2@bandarpos.com';
  IF v_kasir2_id IS NULL THEN
    v_kasir2_id := uuid_generate_v4();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at,
      aud, role
    ) VALUES (
      v_kasir2_id,
      '00000000-0000-0000-0000-000000000000',
      'kasir2@bandarpos.com',
      crypt('Kasir123!', gen_salt('bf')),
      now(),
      '{"full_name": "Budi Kasir", "role": "kasir"}'::jsonb,
      now(), now(),
      'authenticated', 'authenticated'
    );
  END IF;

  -- ----------------------------------------------------------
  -- Upsert Profiles
  -- ----------------------------------------------------------
  INSERT INTO profiles (id, full_name, role, active, created_at)
  VALUES
    (v_admin_id,  'Admin Bandar', 'admin', true, now() - interval '30 days'),
    (v_kasir_id,  'Siti Kasir',   'kasir', true, now() - interval '30 days'),
    (v_kasir2_id, 'Budi Kasir',   'kasir', true, now() - interval '20 days')
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role      = EXCLUDED.role,
        active    = EXCLUDED.active;

  -- ----------------------------------------------------------
  -- Produk
  -- ----------------------------------------------------------
  INSERT INTO products (id, barcode, name, unit, unit_small, unit_conversion, price, stock, stock_min, expired_at, active, created_at, updated_at)
  VALUES
    (v_prod_indomie,   '8999999011004', 'Indomie Goreng',           'dus',    'bks',  40,  3500,   480, 40, '2026-12-31', true, now() - interval '30 days', now()),
    (v_prod_aqua,      '8999999060804', 'Aqua 600ml',               'dus',    'btl',  24,  4000,   288, 24, '2026-06-30', true, now() - interval '30 days', now()),
    (v_prod_teh_botol,  '8999999089508', 'Teh Botol Sosro 450ml',   'dus',    'btl',  24,  5000,   192, 24, '2026-06-01', true, now() - interval '30 days', now()),
    (v_prod_beras,     '8886000000011', 'Beras Premium 5kg',        'karung', NULL,   1,   65000,  50,  5,  NULL,         true, now() - interval '30 days', now()),
    (v_prod_minyak,    '8886000000022', 'Minyak Goreng 1L',         'dus',    'btl',  12,  18500,  120, 12, '2026-08-31', true, now() - interval '30 days', now()),
    (v_prod_gula,      '8886000000033', 'Gula Pasir 1kg',           'karung', NULL,   1,   15000,  80,  10, NULL,         true, now() - interval '30 days', now()),
    (v_prod_kopi,      '8886000000044', 'Kopi Kapal Api Special',   'dus',    'bks',  20,  2500,   200, 20, '2027-01-31', true, now() - interval '30 days', now()),
    (v_prod_susu,      '8886000000055', 'Susu Ultra Milk 250ml',    'dus',    'ktk',  24,  6500,   144, 24, '2026-09-30', true, now() - interval '30 days', now()),
    (v_prod_rokok,     '8886000000066', 'Rokok Sampoerna 12',       'slop',   'bks',  10,  28000,  100, 10, NULL,         true, now() - interval '30 days', now()),
    (v_prod_sabun,     '8886000000077', 'Sabun Lifebuoy 110g',      'dus',    'bh',   48,  4500,   288, 24, NULL,         true, now() - interval '30 days', now())
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------
  -- Transaksi 1: 7 hari lalu - Kasir Siti, Cash
  -- ----------------------------------------------------------
  INSERT INTO transactions (id, invoice_no, cashier_id, payment_method, subtotal, discount, total, paid, change, note, created_at)
  VALUES (
    v_trx1, 'INV-20260611-0001', v_kasir_id, 'cash',
    52000, 0, 52000, 60000, 8000, NULL,
    now() - interval '7 days'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO transaction_items (transaction_id, product_id, product_name, product_barcode, unit, price, quantity, subtotal, created_at)
  VALUES
    (v_trx1, v_prod_indomie,  'Indomie Goreng',         '8999999011004', 'bks', 3500,  5, 17500, now() - interval '7 days'),
    (v_trx1, v_prod_aqua,     'Aqua 600ml',             '8999999060804', 'btl', 4000,  3, 12000, now() - interval '7 days'),
    (v_trx1, v_prod_teh_botol,'Teh Botol Sosro 450ml',  '8999999089508', 'btl', 5000,  2, 10000, now() - interval '7 days'),
    (v_trx1, v_prod_kopi,     'Kopi Kapal Api Special', '8886000000044', 'bks', 2500,  5, 12500, now() - interval '7 days')
  ON CONFLICT (id) DO NOTHING;

  -- Update stok & catat pergerakan untuk trx1
  UPDATE products SET stock = stock - 5 WHERE id = v_prod_indomie;
  UPDATE products SET stock = stock - 3 WHERE id = v_prod_aqua;
  UPDATE products SET stock = stock - 2 WHERE id = v_prod_teh_botol;
  UPDATE products SET stock = stock - 5 WHERE id = v_prod_kopi;

  INSERT INTO stock_movements (product_id, type, qty_before, qty_change, qty_after, note, reference_id, user_id, created_at)
  VALUES
    (v_prod_indomie,  'sale', 480, -5, 475, 'Penjualan INV-20260611-0001', v_trx1, v_kasir_id,  now() - interval '7 days'),
    (v_prod_aqua,     'sale', 288, -3, 285, 'Penjualan INV-20260611-0001', v_trx1, v_kasir_id,  now() - interval '7 days'),
    (v_prod_teh_botol,'sale', 192, -2, 190, 'Penjualan INV-20260611-0001', v_trx1, v_kasir_id,  now() - interval '7 days'),
    (v_prod_kopi,     'sale', 200, -5, 195, 'Penjualan INV-20260611-0001', v_trx1, v_kasir_id,  now() - interval '7 days')
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------
  -- Transaksi 2: 5 hari lalu - Kasir Budi, QRIS
  -- ----------------------------------------------------------
  INSERT INTO transactions (id, invoice_no, cashier_id, payment_method, subtotal, discount, total, paid, change, note, created_at)
  VALUES (
    v_trx2, 'INV-20260613-0001', v_kasir2_id, 'qris',
    149000, 9000, 140000, 140000, 0, 'Diskon member 10rb',
    now() - interval '5 days'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO transaction_items (transaction_id, product_id, product_name, product_barcode, unit, price, quantity, subtotal, created_at)
  VALUES
    (v_trx2, v_prod_beras,  'Beras Premium 5kg',  '8886000000011', 'karung', 65000, 1, 65000, now() - interval '5 days'),
    (v_trx2, v_prod_minyak, 'Minyak Goreng 1L',   '8886000000022', 'btl',    18500, 2, 37000, now() - interval '5 days'),
    (v_trx2, v_prod_gula,   'Gula Pasir 1kg',     '8886000000033', 'karung', 15000, 3, 45000, now() - interval '5 days')
  ON CONFLICT (id) DO NOTHING;

  UPDATE products SET stock = stock - 1 WHERE id = v_prod_beras;
  UPDATE products SET stock = stock - 2 WHERE id = v_prod_minyak;
  UPDATE products SET stock = stock - 3 WHERE id = v_prod_gula;

  INSERT INTO stock_movements (product_id, type, qty_before, qty_change, qty_after, note, reference_id, user_id, created_at)
  VALUES
    (v_prod_beras,  'sale', 50, -1, 49, 'Penjualan INV-20260613-0001', v_trx2, v_kasir2_id, now() - interval '5 days'),
    (v_prod_minyak, 'sale', 120, -2, 118, 'Penjualan INV-20260613-0001', v_trx2, v_kasir2_id, now() - interval '5 days'),
    (v_prod_gula,   'sale', 80, -3, 77, 'Penjualan INV-20260613-0001', v_trx2, v_kasir2_id, now() - interval '5 days')
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------
  -- Transaksi 3: 3 hari lalu - Kasir Siti, Cash
  -- ----------------------------------------------------------
  INSERT INTO transactions (id, invoice_no, cashier_id, payment_method, subtotal, discount, total, paid, change, note, created_at)
  VALUES (
    v_trx3, 'INV-20260615-0001', v_kasir_id, 'cash',
    87500, 0, 87500, 100000, 12500, NULL,
    now() - interval '3 days'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO transaction_items (transaction_id, product_id, product_name, product_barcode, unit, price, quantity, subtotal, created_at)
  VALUES
    (v_trx3, v_prod_rokok, 'Rokok Sampoerna 12', '8886000000066', 'bks', 28000, 2, 56000, now() - interval '3 days'),
    (v_trx3, v_prod_susu,  'Susu Ultra Milk 250ml', '8886000000055', 'ktk', 6500, 3, 19500, now() - interval '3 days'),
    (v_trx3, v_prod_sabun, 'Sabun Lifebuoy 110g', '8886000000077', 'bh', 4000, 3, 12000, now() - interval '3 days')
  ON CONFLICT (id) DO NOTHING;

  UPDATE products SET stock = stock - 2 WHERE id = v_prod_rokok;
  UPDATE products SET stock = stock - 3 WHERE id = v_prod_susu;
  UPDATE products SET stock = stock - 3 WHERE id = v_prod_sabun;

  INSERT INTO stock_movements (product_id, type, qty_before, qty_change, qty_after, note, reference_id, user_id, created_at)
  VALUES
    (v_prod_rokok, 'sale', 100, -2, 98, 'Penjualan INV-20260615-0001', v_trx3, v_kasir_id, now() - interval '3 days'),
    (v_prod_susu,  'sale', 144, -3, 141, 'Penjualan INV-20260615-0001', v_trx3, v_kasir_id, now() - interval '3 days'),
    (v_prod_sabun, 'sale', 288, -3, 285, 'Penjualan INV-20260615-0001', v_trx3, v_kasir_id, now() - interval '3 days')
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------
  -- Transaksi 4: Kemarin - Kasir Budi, Cash
  -- ----------------------------------------------------------
  INSERT INTO transactions (id, invoice_no, cashier_id, payment_method, subtotal, discount, total, paid, change, note, created_at)
  VALUES (
    v_trx4, 'INV-20260617-0001', v_kasir2_id, 'cash',
    46000, 0, 46000, 50000, 4000, NULL,
    now() - interval '1 day'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO transaction_items (transaction_id, product_id, product_name, product_barcode, unit, price, quantity, subtotal, created_at)
  VALUES
    (v_trx4, v_prod_indomie,   'Indomie Goreng',         '8999999011004', 'bks', 3500, 4, 14000, now() - interval '1 day'),
    (v_trx4, v_prod_teh_botol, 'Teh Botol Sosro 450ml',  '8999999089508', 'btl', 5000, 4, 20000, now() - interval '1 day'),
    (v_trx4, v_prod_kopi,      'Kopi Kapal Api Special', '8886000000044', 'bks', 2500, 4, 12000, now() - interval '1 day')
  ON CONFLICT (id) DO NOTHING;

  UPDATE products SET stock = stock - 4 WHERE id = v_prod_indomie;
  UPDATE products SET stock = stock - 4 WHERE id = v_prod_teh_botol;
  UPDATE products SET stock = stock - 4 WHERE id = v_prod_kopi;

  INSERT INTO stock_movements (product_id, type, qty_before, qty_change, qty_after, note, reference_id, user_id, created_at)
  VALUES
    (v_prod_indomie,   'sale', 475, -4, 471, 'Penjualan INV-20260617-0001', v_trx4, v_kasir2_id, now() - interval '1 day'),
    (v_prod_teh_botol, 'sale', 190, -4, 186, 'Penjualan INV-20260617-0001', v_trx4, v_kasir2_id, now() - interval '1 day'),
    (v_prod_kopi,      'sale', 195, -4, 191, 'Penjualan INV-20260617-0001', v_trx4, v_kasir2_id, now() - interval '1 day')
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------
  -- Transaksi 5: Hari ini - Kasir Siti, QRIS
  -- ----------------------------------------------------------
  INSERT INTO transactions (id, invoice_no, cashier_id, payment_method, subtotal, discount, total, paid, change, note, created_at)
  VALUES (
    v_trx5, 'INV-20260618-0001', v_kasir_id, 'qris',
    130000, 5000, 125000, 125000, 0, 'Promo weekend',
    now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO transaction_items (transaction_id, product_id, product_name, product_barcode, unit, price, quantity, subtotal, created_at)
  VALUES
    (v_trx5, v_prod_aqua,   'Aqua 600ml',       '8999999060804', 'btl', 4000,  5, 20000, now()),
    (v_trx5, v_prod_minyak, 'Minyak Goreng 1L', '8886000000022', 'btl', 18500, 3, 55500, now()),
    (v_trx5, v_prod_gula,   'Gula Pasir 1kg',   '8886000000033', 'karung', 15000, 2, 30000, now()),
    (v_trx5, v_prod_susu,   'Susu Ultra Milk 250ml', '8886000000055', 'ktk', 6500, 4, 26000, now())
  ON CONFLICT (id) DO NOTHING;

  UPDATE products SET stock = stock - 5 WHERE id = v_prod_aqua;
  UPDATE products SET stock = stock - 3 WHERE id = v_prod_minyak;
  UPDATE products SET stock = stock - 2 WHERE id = v_prod_gula;
  UPDATE products SET stock = stock - 4 WHERE id = v_prod_susu;

  INSERT INTO stock_movements (product_id, type, qty_before, qty_change, qty_after, note, reference_id, user_id, created_at)
  VALUES
    (v_prod_aqua,   'sale', 285, -5, 280, 'Penjualan INV-20260618-0001', v_trx5, v_kasir_id, now()),
    (v_prod_minyak, 'sale', 118, -3, 115, 'Penjualan INV-20260618-0001', v_trx5, v_kasir_id, now()),
    (v_prod_gula,   'sale', 77,  -2, 75,  'Penjualan INV-20260618-0001', v_trx5, v_kasir_id, now()),
    (v_prod_susu,   'sale', 141, -4, 137, 'Penjualan INV-20260618-0001', v_trx5, v_kasir_id, now())
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------
  -- Stock Opname: Admin melakukan penyesuaian stok
  -- ----------------------------------------------------------
  INSERT INTO stock_movements (product_id, type, qty_before, qty_change, qty_after, note, reference_id, user_id, created_at)
  VALUES
    (v_prod_beras, 'opname', 49, 1, 50, 'Koreksi stok opname bulanan', NULL, v_admin_id, now() - interval '10 days')
  ON CONFLICT (id) DO NOTHING;

  UPDATE products SET stock = 50 WHERE id = v_prod_beras;

  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Seed selesai!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Admin ID  : %', v_admin_id;
  RAISE NOTICE 'Kasir ID  : %', v_kasir_id;
  RAISE NOTICE 'Kasir2 ID : %', v_kasir2_id;
  RAISE NOTICE '----------------------------------------------------';
  RAISE NOTICE 'Login Admin  : admin@bandarpos.com / Admin123!';
  RAISE NOTICE 'Login Kasir  : kasir@bandarpos.com / Kasir123!';
  RAISE NOTICE 'Login Kasir2 : kasir2@bandarpos.com / Kasir123!';
  RAISE NOTICE '====================================================';

END $$;
