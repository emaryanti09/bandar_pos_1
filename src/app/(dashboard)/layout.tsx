import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardNav from '@/components/ui/DashboardNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNav profile={profile} />
      <main className="flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
