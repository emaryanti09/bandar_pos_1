-- FIX: trigger handle_new_user gagal saat dipanggil GoTrue (Auth) → error 500
-- "Database error creating new user" dengan message kosong.
--
-- Penyebab: fungsi SECURITY DEFINER tanpa `SET search_path`. Saat trigger
-- dieksekusi oleh role auth GoTrue, search_path tidak mengarah ke schema public
-- sehingga tabel `profiles` tidak ditemukan dan INSERT gagal — me-rollback
-- seluruh proses createUser().
--
-- Solusi: set search_path = public dan prefix tabel secara eksplisit.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'kasir')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
