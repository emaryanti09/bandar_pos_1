import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { data, error } = await supabase
    .from('transactions')
    .select(`*, profiles(full_name), transaction_items(*)`)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { payment_method, subtotal, discount, total, paid, change, note, items } = body

  if (!items?.length) return NextResponse.json({ error: 'Items tidak boleh kosong' }, { status: 400 })

  const { error } = await supabase.rpc('update_sale', {
    p_transaction_id: id,
    p_editor_id: user.id,
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

  const { data: trx } = await supabase
    .from('transactions')
    .select(`*, profiles(full_name), transaction_items(*)`)
    .eq('id', id)
    .single()

  return NextResponse.json({ data: trx })
}
