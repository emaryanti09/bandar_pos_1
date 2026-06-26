import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const lowStock = searchParams.get('low_stock') === 'true'
  const expiring = searchParams.get('expiring') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  // Saat search (live di kasir) jangan hitung count exact — itu memaksa
  // full COUNT(*) tiap ketikan dan jadi bottleneck utama.
  const wantCount = !search

  let query = supabase
    .from('products')
    .select('*', wantCount ? { count: 'exact' } : undefined)
    .eq('active', true)
    .order('name')

  if (search) {
    query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`)
  }

  if (lowStock) {
    query = query.filter('stock', 'lte', supabase.rpc('products.stock_min'))
  }

  if (expiring) {
    const thirtyDaysLater = new Date()
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
    query = query.lte('expired_at', thirtyDaysLater.toISOString().split('T')[0])
      .not('expired_at', 'is', null)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase.from('products').insert(body).select().single()

  if (error) {
    if (error.code === '23505' && error.message.includes('barcode')) {
      return NextResponse.json({ error: 'Barcode sudah digunakan produk lain. Gunakan barcode yang berbeda atau kosongkan.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
