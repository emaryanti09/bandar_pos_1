import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PengaturanClient from '@/components/pengaturan/PengaturanClient'

export default async function PengaturanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/kasir')

  const { data: settings } = await supabase.from('store_settings').select('*').single()
  return <PengaturanClient initialSettings={settings} />
}
