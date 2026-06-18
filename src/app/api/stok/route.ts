import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('product_id')

  let query = supabase
    .from('stock_movements')
    .select(`*, products(name, unit)`)
    .order('created_at', { ascending: false })
    .limit(100)

  if (productId) query = query.eq('product_id', productId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { product_id, type, qty_new, note, batches } = body

  const { data: product } = await supabase.from('products').select('stock, expired_at').eq('id', product_id).single()
  if (!product) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })

  // Multi-batch purchase
  if (batches && Array.isArray(batches) && batches.length > 0) {
    const totalQty = batches.reduce((s: number, b: { qty: number }) => s + b.qty, 0)
    const newStock = product.stock + totalQty

    // Hitung expired_at terdekat dari semua batch + existing
    const allDates: string[] = []
    if (product.expired_at) allDates.push(product.expired_at)
    for (const b of batches) {
      if (b.expired_at) allDates.push(b.expired_at)
    }
    const nearestExpiry = allDates.length > 0
      ? allDates.sort()[0]
      : null

    // Update stok produk
    const updatePayload: Record<string, unknown> = { stock: newStock }
    if (nearestExpiry !== null) updatePayload.expired_at = nearestExpiry

    const { error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', product_id)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // Insert satu stock_movement per batch
    const movements = batches.map((b: { qty: number; expired_at: string | null; note: string | null }) => ({
      product_id,
      type: 'adjustment',
      qty_before: product.stock,
      qty_change: b.qty,
      qty_after: newStock,
      note: b.note || `Pembelian +${b.qty}`,
      expired_at: b.expired_at || null,
      user_id: user.id,
    }))

    const { data, error } = await supabase.from('stock_movements').insert(movements).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  }

  // Legacy: single adjustment (stok opname, dll)
  const qtyBefore = product.stock
  const qtyChange = qty_new - qtyBefore

  const { error: updateError } = await supabase.from('products').update({ stock: qty_new }).eq('id', product_id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { data, error } = await supabase.from('stock_movements').insert({
    product_id,
    type: type || 'opname',
    qty_before: qtyBefore,
    qty_change: qtyChange,
    qty_after: qty_new,
    note: note || 'Stock opname',
    user_id: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
