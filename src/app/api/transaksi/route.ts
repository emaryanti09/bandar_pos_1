import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('transactions')
    .select(`*, profiles(full_name), transaction_items(*)`, { count: 'exact' })
    .order('created_at', { ascending: false })

  // Filter pakai offset WIB (+07:00) agar jam 00.00–06.59 WIB masuk hari yang benar
  if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00+07:00`)
  if (dateTo) query = query.lt('created_at', `${dateTo}T23:59:59+07:00`)

  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { payment_method, subtotal, discount, total, paid, change, note, items } = body

  if (!items?.length) return NextResponse.json({ error: 'Cart kosong' }, { status: 400 })

  const { data, error } = await supabase.rpc('process_sale', {
    p_cashier_id: user.id,
    p_payment_method: payment_method,
    p_subtotal: subtotal,
    p_discount: discount ?? 0,
    p_total: total,
    p_paid: paid,
    p_change: change,
    p_note: note ?? null,
    p_items: items,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch transaction detail untuk struk
  const { data: trx } = await supabase
    .from('transactions')
    .select(`*, profiles(full_name), transaction_items(*)`)
    .eq('id', data)
    .single()

  return NextResponse.json({ data: trx }, { status: 201 })
}
