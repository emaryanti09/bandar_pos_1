import { createClient } from '@/lib/supabase/server'
import KasirClient from '@/components/kasir/KasirClient'

export default async function KasirPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('store_settings').select('*').single()
  return <KasirClient storeSettings={settings} />
}
