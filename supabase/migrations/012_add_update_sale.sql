-- Fungsi update_sale: edit transaksi yang sudah ada secara atomic
-- Rollback stock dari items lama, lalu apply stock dari items baru
CREATE OR REPLACE FUNCTION update_sale(
  p_transaction_id uuid,
  p_editor_id uuid,
  p_payment_method text,
  p_subtotal decimal,
  p_discount decimal,
  p_total decimal,
  p_paid decimal,
  p_change decimal,
  p_note text,
  p_items jsonb
)
RETURNS void AS $$
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_qty_before int;
  v_invoice_no text;
BEGIN
  -- Ambil invoice_no untuk catatan stock_movements
  SELECT invoice_no INTO v_invoice_no FROM transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  -- 1. Rollback stock dari transaction_items lama (hanya yang punya product_id)
  FOR v_item IN
    SELECT
      jsonb_build_object(
        'product_id', product_id,
        'quantity', quantity
      )
    FROM transaction_items
    WHERE transaction_id = p_transaction_id
      AND product_id IS NOT NULL
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    SELECT stock INTO v_qty_before FROM products WHERE id = v_product_id;

    UPDATE products
      SET stock = stock + (v_item->>'quantity')::int
      WHERE id = v_product_id;

    INSERT INTO stock_movements (product_id, type, qty_before, qty_change, qty_after, note, reference_id, user_id)
    VALUES (
      v_product_id,
      'adjustment',
      v_qty_before,
      (v_item->>'quantity')::int,
      v_qty_before + (v_item->>'quantity')::int,
      'Edit transaksi (rollback) ' || v_invoice_no,
      p_transaction_id,
      p_editor_id
    );
  END LOOP;

  -- 2. Hapus semua items lama
  DELETE FROM transaction_items WHERE transaction_id = p_transaction_id;

  -- 3. Update header transaksi
  UPDATE transactions SET
    payment_method = p_payment_method,
    subtotal       = p_subtotal,
    discount       = p_discount,
    total          = p_total,
    paid           = p_paid,
    change         = p_change,
    note           = p_note
  WHERE id = p_transaction_id;

  -- 4. Insert items baru + deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := CASE
      WHEN v_item->>'product_id' IS NOT NULL AND v_item->>'product_id' != 'null'
      THEN (v_item->>'product_id')::uuid
      ELSE NULL
    END;

    INSERT INTO transaction_items (transaction_id, product_id, product_name, product_barcode, unit, price, quantity, subtotal)
    VALUES (
      p_transaction_id,
      v_product_id,
      v_item->>'product_name',
      v_item->>'product_barcode',
      v_item->>'unit',
      (v_item->>'price')::decimal,
      (v_item->>'quantity')::int,
      (v_item->>'subtotal')::decimal
    );

    IF v_product_id IS NOT NULL THEN
      SELECT stock INTO v_qty_before FROM products WHERE id = v_product_id;

      UPDATE products
        SET stock = stock - (v_item->>'quantity')::int
        WHERE id = v_product_id;

      INSERT INTO stock_movements (product_id, type, qty_before, qty_change, qty_after, note, reference_id, user_id)
      VALUES (
        v_product_id,
        'sale',
        v_qty_before,
        -((v_item->>'quantity')::int),
        v_qty_before - (v_item->>'quantity')::int,
        'Edit transaksi ' || v_invoice_no,
        p_transaction_id,
        p_editor_id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
