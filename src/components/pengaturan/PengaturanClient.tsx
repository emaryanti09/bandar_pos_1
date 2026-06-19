'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Edit2, Trash2, Eye, EyeOff, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import type { StoreSettings, Profile } from '@/types'

interface Props {
  initialSettings: StoreSettings | null
}

export default function PengaturanClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState({
    store_name: initialSettings?.store_name || '',
    whatsapp: initialSettings?.whatsapp || '',
    address: initialSettings?.address || '',
    footer_note: initialSettings?.footer_note || 'Terima kasih telah berbelanja!',
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [users, setUsers] = useState<Profile[]>([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    const res = await fetch('/api/users')
    const { data } = await res.json()
    setUsers(data || [])
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    const res = await fetch('/api/pengaturan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSavingSettings(false)
    if (res.ok) toast.success('Pengaturan disimpan')
    else toast.error('Gagal menyimpan')
  }

  async function handleDeleteUser(user: Profile) {
    if (!confirm(`Nonaktifkan akun ${user.full_name}?`)) return
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Akun dinonaktifkan'); loadUsers() }
    else toast.error('Gagal')
  }

  return (
    <div className="max-w-screen-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Pengaturan</h1>

      {/* Store settings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-800 mb-4">Informasi Toko</h2>
        <form onSubmit={handleSaveSettings} className="space-y-4 max-w-md">
          <div>
            <label className="label">Nama Toko</label>
            <input value={settings.store_name} onChange={e => setSettings(s => ({ ...s, store_name: e.target.value }))}
              className="input" required />
          </div>
          <div>
            <label className="label">Nomor WhatsApp</label>
            <input value={settings.whatsapp} onChange={e => setSettings(s => ({ ...s, whatsapp: e.target.value }))}
              className="input" placeholder="08123456789" />
          </div>
          <div>
            <label className="label">Alamat</label>
            <textarea value={settings.address} onChange={e => setSettings(s => ({ ...s, address: e.target.value }))}
              className="input" rows={2} />
          </div>
          <div>
            <label className="label">Pesan Footer Struk</label>
            <input value={settings.footer_note} onChange={e => setSettings(s => ({ ...s, footer_note: e.target.value }))}
              className="input" />
          </div>
          <button type="submit" disabled={savingSettings}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-60">
            <Save className="w-4 h-4" />
            {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </form>
      </div>

      {/* User management */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">Kelola User</h2>
          <button onClick={() => { setEditUser(null); setShowUserModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
            <Plus className="w-4 h-4" /> Tambah User
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {u.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{u.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{u.role} {!u.active && '· Nonaktif'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!u.active && <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Nonaktif</span>}
                <button onClick={() => { setEditUser(u); setShowUserModal(true) }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteUser(u)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showUserModal && (
        <ModalUser
          user={editUser}
          onClose={() => { setShowUserModal(false); setEditUser(null) }}
          onSaved={() => { setShowUserModal(false); setEditUser(null); loadUsers() }}
        />
      )}
    </div>
  )
}

function ModalUser({ user, onClose, onSaved }: { user: Profile | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: user?.full_name || '',
    role: user?.role || 'kasir',
    active: user?.active ?? true,
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name) { toast.error('Nama wajib diisi'); return }
    if (!user && (!form.email || !form.password)) { toast.error('Email & password wajib untuk user baru'); return }
    setLoading(true)

    if (user) {
      const body: Record<string, unknown> = { full_name: form.full_name, role: form.role, active: form.active }
      if (form.password) body.password = form.password
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      setLoading(false)
      if (res.ok) { toast.success('User diperbarui'); onSaved() }
      else { const r = await res.json(); toast.error(r.error || 'Gagal') }
    } else {
      const res = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, full_name: form.full_name, role: form.role }),
      })
      setLoading(false)
      if (res.ok) { toast.success('User berhasil ditambahkan'); onSaved() }
      else { const r = await res.json(); toast.error(r.error || 'Gagal') }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-900">{user ? 'Edit User' : 'Tambah User'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Nama Lengkap *</label>
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="input" required />
          </div>
          {!user && (
            <div>
              <label className="label">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" required />
            </div>
          )}
          <div>
            <label className="label">{user ? 'Password Baru (kosongkan jika tidak berubah)' : 'Password *'}</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input pr-10" required={!user} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Role *</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'kasir' }))} className="input">
              <option value="kasir">Kasir</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {user && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-red-600" />
              <span className="text-sm text-gray-700">Akun aktif</span>
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-60">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
