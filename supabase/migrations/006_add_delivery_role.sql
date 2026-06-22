-- Update CHECK constraint role untuk tambah 'delivery'
-- Drop semua constraint yang mengandung 'role' di table profiles
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%'
  LIMIT 1;

  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT ' || quote_ident(con_name);
  END IF;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'kasir', 'delivery'));
