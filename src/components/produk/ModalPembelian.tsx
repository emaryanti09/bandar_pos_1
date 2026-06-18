'use client'

import { useState } from 'react'
import { X, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function ModalPembelian({ onClose, onSaved }: Props) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [qty, setQty] = useState('1')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSearch(q: string) {
    setSearch(q)
    if (!q.trim()) { setResults([]); return }
    const res = await fetch(`/api/produk?search=${encodeURIComponent(q)}&limit=8`)
    const { data } = await res.json()
    setResults(data || [])
  }

  async function handleSimpan() {
    if (!selected || parseInt(qty) < 1) { toast.error('Pilih produk & qty'); return }
    setLoading(true)

    const { data: { users: [authUser] } } = await (await fetch('/api/auth-user')).json().catch(() => ({ data: { users: [] } }))

    const res = await fetch('/api/stok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: selected.id,
        type: 'adjustment',
        qty_new: selected.stock + parseInt(qty),
        note: note || `Pembelian +${qty} ${selected.unit_small || selected.unit}`,
      }),
    })

    const result = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(result.error || 'Gagal'); return }
    toast.success(`+${qty} stok ditambahkan untuk ${selected.name}`)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-900">Tambah Stok (Pembelian)</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Cari produk..." />
          </div>

          {results.length > 0 && !selected && (
            <div className="border border-gray-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {results.map(p => (
                <button key={p.id} onClick={() => { setSelected(p); setResults([]) }}
                  className="w-full px-4 py-3 hover:bg-blue-50 text-left border-b last:border-0 text-sm">
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">Stok: {p.stock} {p.unit_small || p.unit}</p>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="bg-green-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{selected.name}</p>
                  <p className="text-sm text-gray-500">Stok saat ini: {selected.stock} {selected.unit_small || selected.unit}</p>
                </div>
                <button onClick={() => { setSelected(null); setSearch('') }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="label">Jumlah yang dibeli</label>
                <input type="number" value={qty} onChange={e => setQty(e.target.value)}
                  className="input text-center text-xl font-bold" min="1" autoFocus />
              </div>
              <p className="text-sm text-center text-green-700">
                Stok baru: <strong>{selected.stock + parseInt(qty || '0')} {selected.unit_small || selected.unit}</strong>
              </p>
              <div>
                <label className="label">Catatan (opsional)</label>
                <input value={note} onChange={e => setNote(e.target.value)} className="input" placeholder="Supplier, no faktur, dll." />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Batal</button>
            <button onClick={handleSimpan} disabled={!selected || loading}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-40">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
