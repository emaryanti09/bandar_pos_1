import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { product_id, qty_packs } = await req.json()

  const { error } = await supabase.rpc('open_pack', {
    p_product_id: product_id,
    p_user_id: user.id,
    p_qty_packs: qty_packs,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: product } = await supabase.from('products').select('*').eq('id', product_id).single()
  return NextResponse.json({ data: product })
}
