-- Fix process_sale: skip update stok & stock_movements untuk item tanpa product_id (misal ongkos kirim)
CREATE OR REPLACE FUNCTION process_sale(
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
RETURNS uuid AS $$
DECLARE
  v_transaction_id uuid;
  v_invoice_no text;
  v_item jsonb;
  v_qty_before int;
  v_product_id uuid;
BEGIN
  v_invoice_no := generate_invoice_no();

  INSERT INTO transactions (invoice_no, cashier_id, payment_method, subtotal, discount, total, paid, change, note)
  VALUES (v_invoice_no, p_cashier_id, p_payment_method, p_subtotal, p_discount, p_total, p_paid, p_change, p_note)
  RETURNING id INTO v_transaction_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := CASE
      WHEN v_item->>'product_id' IS NOT NULL AND v_item->>'product_id' != 'null'
      THEN (v_item->>'product_id')::uuid
      ELSE NULL
    END;

    INSERT INTO transaction_items (transaction_id, product_id, product_name, product_barcode, unit, price, quantity, subtotal)
    VALUES (
      v_transaction_id,
      v_product_id,
      v_item->>'product_name',
      v_item->>'product_barcode',
      v_item->>'unit',
      (v_item->>'price')::decimal,
      (v_item->>'quantity')::int,
      (v_item->>'subtotal')::decimal
    );

    -- Hanya update stok dan catat movement jika ada product_id (bukan ongkir dll)
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
        'Penjualan ' || v_invoice_no,
        v_transaction_id,
        p_cashier_id
      );
    END IF;
  END LOOP;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
