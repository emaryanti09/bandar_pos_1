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
  const { product_id, type, qty_new, note } = body

  const { data: product } = await supabase.from('products').select('stock').eq('id', product_id).single()
  if (!product) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })

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
