import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'transaksi'
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  if (type === 'transaksi') {
    let query = supabase
      .from('transactions')
      .select(`*, profiles(full_name), transaction_items(*)`)
      .order('created_at', { ascending: false })

    // Filter pakai offset WIB (+07:00) agar jam 00.00–06.59 WIB masuk hari yang benar
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00+07:00`)
    if (dateTo) query = query.lt('created_at', `${dateTo}T23:59:59+07:00`)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const totalRevenue = data?.reduce((sum, t) => sum + t.total, 0) ?? 0
    const totalTransactions = data?.length ?? 0
    const cashCount = data?.filter(t => t.payment_method === 'cash').length ?? 0
    const qrisCount = data?.filter(t => t.payment_method === 'qris').length ?? 0

    return NextResponse.json({
      data,
      summary: { totalRevenue, totalTransactions, cashCount, qrisCount }
    })
  }

  if (type === 'stok') {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (type === 'hampir_habis') {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .filter('stock', 'lte', 'stock_min')
      .order('stock')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Filter di JS karena Supabase tidak support column-to-column comparison langsung
    const filtered = data?.filter(p => p.stock <= p.stock_min) ?? []
    return NextResponse.json({ data: filtered })
  }

  if (type === 'kadaluarsa') {
    const thirtyDaysLater = new Date()
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .not('expired_at', 'is', null)
      .lte('expired_at', thirtyDaysLater.toISOString().split('T')[0])
      .order('expired_at')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
