import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProdukClient from '@/components/produk/ProdukClient'

export default async function ProdukPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/kasir')

  return <ProdukClient />
}
