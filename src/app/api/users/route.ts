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

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: role || 'kasir' },
    })

    if (createError) {
      const e = createError as unknown as Record<string, unknown>
      return NextResponse.json({
        error: 'createUser gagal',
        detail: { message: createError.message, code: e.code, status: e.status, name: createError.name }
      }, { status: 500 })
    }

    if (newUser?.user) {
      await new Promise(r => setTimeout(r, 300))
      const { error: profileError } = await adminSupabase
        .from('profiles')
        .upsert({ id: newUser.user.id, full_name, role: role || 'kasir', active: true })
      if (profileError) {
        return NextResponse.json({
          error: `Profile upsert gagal`,
          detail: {
            message: profileError.message,
            code: profileError.code,
            hint: profileError.hint,
            details: profileError.details,
          }
        }, { status: 500 })
      }
    }

    return NextResponse.json({ data: { id: newUser.user?.id, email, full_name, role } }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 })
  }
}
