-- Tambah relasi linked product untuk buka bungkus cross-product
ALTER TABLE products ADD COLUMN IF NOT EXISTS linked_product_id uuid REFERENCES products(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS linked_qty int DEFAULT 1;

-- Update fungsi open_pack untuk support cross-product
CREATE OR REPLACE FUNCTION open_pack(
  p_product_id uuid,
  p_user_id uuid,
  p_qty_packs int
)
RETURNS void AS $$
DECLARE
  v_product products%rowtype;
  v_linked  products%rowtype;
  v_qty_add int;
  v_qty_before_big int;
  v_qty_before_small int;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id;

  -- Mode cross-product: produk besar punya linked_product_id
  IF v_product.linked_product_id IS NOT NULL THEN
    SELECT * INTO v_linked FROM products WHERE id = v_product.linked_product_id;

    IF v_product.stock < p_qty_packs THEN
      RAISE EXCEPTION 'Stok % tidak cukup (tersisa %)', v_product.name, v_product.stock;
    END IF;

    v_qty_add := p_qty_packs * COALESCE(v_product.linked_qty, 1);
    v_qty_before_big := v_product.stock;
    v_qty_before_small := v_linked.stock;

    -- Kurangi stok produk besar
    UPDATE products SET stock = stock - p_qty_packs WHERE id = p_product_id;

    INSERT INTO stock_movements (product_id, type, qty_before, qty_change, qty_after, note, user_id)
    VALUES (
      p_product_id, 'open_pack',
      v_qty_before_big, -p_qty_packs, v_qty_before_big - p_qty_packs,
      'Buka bungkus ' || p_qty_packs || ' ' || v_product.unit || ' → ' || v_linked.name,
      p_user_id
    );

    -- Tambah stok produk kecil
    UPDATE products SET stock = stock + v_qty_add WHERE id = v_product.linked_product_id;

    INSERT INTO stock_movements (product_id, type, qty_before, qty_change, qty_after, note, user_id)
    VALUES (
      v_product.linked_product_id, 'open_pack',
      v_qty_before_small, v_qty_add, v_qty_before_small + v_qty_add,
      'Hasil buka bungkus dari ' || p_qty_packs || ' ' || v_product.unit || ' ' || v_product.name,
      p_user_id
    );

  -- Mode lama: satu produk, unit_conversion > 1
  ELSE
    IF v_product.unit_conversion IS NULL OR v_product.unit_conversion <= 1 THEN
      RAISE EXCEPTION 'Produk tidak memiliki konversi unit';
    END IF;

    v_qty_add := p_qty_packs * v_product.unit_conversion;

    UPDATE products SET stock = stock + v_qty_add WHERE id = p_product_id;

    INSERT INTO stock_movements (product_id, type, qty_before, qty_change, qty_after, note, user_id)
    VALUES (
      p_product_id, 'open_pack',
      v_product.stock, v_qty_add, v_product.stock + v_qty_add,
      'Buka bungkus ' || p_qty_packs || ' ' || v_product.unit,
      p_user_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
