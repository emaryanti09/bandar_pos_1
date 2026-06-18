import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const products = body.products as Array<{
    barcode?: string
    name: string
    unit: string
    unit_small?: string
    unit_conversion?: number
    price: number
    stock: number
    stock_min?: number
    expired_at?: string
  }>

  if (!products?.length) return NextResponse.json({ error: 'No products' }, { status: 400 })

  const { data, error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'barcode', ignoreDuplicates: false })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count: data?.length })
}
