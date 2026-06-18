import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const barcode = searchParams.get('code')
  if (!barcode) return NextResponse.json({ error: 'Barcode required' }, { status: 400 })

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .eq('active', true)
    .single()

  if (error || !data) return NextResponse.json({ data: null })
  return NextResponse.json({ data })
}
