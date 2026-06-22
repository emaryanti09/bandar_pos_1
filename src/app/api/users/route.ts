import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key tidak terkonfigurasi di server' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr) return NextResponse.json({ error: 'Auth error: ' + authErr.message }, { status: 500 })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { email, password, full_name, role } = await req.json()
    if (!email || !password || !full_name) return NextResponse.json({ error: 'Email, password, nama wajib diisi' }, { status: 400 })

    const adminSupabase = getAdminClient()
    const finalRole = role || 'kasir'

    // Buat user TANPA role di metadata — biar trigger handle_new_user insert
    // dengan role default 'kasir' (pasti lolos constraint). Role asli di-update sesudahnya.
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createError) {
      const ce = createError as unknown as { message?: string; status?: number; code?: string; name?: string }
      const detail = ce.message || ce.code || ce.name || `status ${ce.status}` || 'unknown'
      return NextResponse.json({ error: `createUser: ${detail}`, status: ce.status, code: ce.code }, { status: 500 })
    }

    if (newUser?.user) {
      // Update role + full_name + active (trigger sudah insert baris default)
      const { error: profileError } = await adminSupabase
        .from('profiles')
        .update({ full_name, role: finalRole, active: true })
        .eq('id', newUser.user.id)
      if (profileError) {
        return NextResponse.json({ error: `profile update: ${profileError.message || profileError.code || 'unknown'}` }, { status: 500 })
      }
    }

    return NextResponse.json({ data: { id: newUser.user?.id, email, full_name, role: finalRole } }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 })
  }
}
