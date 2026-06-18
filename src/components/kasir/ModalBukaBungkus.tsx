'use client'

import { useState } from 'react'
import { X, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product } from '@/types'
import { formatRupiah } from '@/lib/utils'

export default function ModalBukaBungkus({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [qty, setQty] = useState('1')
  const [loading, setLoading] = useState(false)

  async function handleSearch(q: string) {
    setSearch(q)
    if (!q.trim()) { setResults([]); return }
    const res = await fetch(`/api/produk?search=${encodeURIComponent(q)}&limit=8`)
    const { data } = await res.json()
    setResults((data || []).filter((p: Product) => p.unit_conversion > 1))
  }

  async function handleBukaBungkus() {
    if (!selected) return
    const qtyNum = parseInt(qty)
    if (qtyNum < 1) { toast.error('Qty minimal 1'); return }
    setLoading(true)

    const res = await fetch('/api/stok/buka-bungkus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: selected.id, qty_packs: qtyNum }),
    })

    const result = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(result.error || 'Gagal'); return }

    toast.success(`Berhasil buka ${qtyNum} ${selected.unit} → +${qtyNum * selected.unit_conversion} ${selected.unit_small || 'pcs'}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-900">Buka Bungkus</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Cari produk dengan unit besar..." />
          </div>

          {results.length > 0 && !selected && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              {results.map(p => (
                <button key={p.id} onClick={() => { setSelected(p); setResults([]) }}
                  className="w-full px-4 py-3 hover:bg-blue-50 text-left border-b last:border-0 transition-colors">
                  <p className="font-medium text-sm text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">1 {p.unit} = {p.unit_conversion} {p.unit_small} · Stok: {p.stock}</p>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">{selected.name}</p>
                  <p className="text-sm text-gray-500">1 {selected.unit} = {selected.unit_conversion} {selected.unit_small}</p>
                  <p className="text-sm text-gray-500">Stok saat ini: {selected.stock}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah {selected.unit} dibuka</label>
                <input type="number" value={qty} onChange={e => setQty(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl font-bold"
                  min="1" />
              </div>
              <div className="bg-white rounded-lg p-3 text-sm text-gray-600 text-center">
                Stok bertambah: <strong className="text-green-600">+{parseInt(qty || '0') * selected.unit_conversion} {selected.unit_small}</strong>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">
              Batal
            </button>
            <button onClick={handleBukaBungkus} disabled={!selected || loading}
              className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-40 transition-colors">
              {loading ? 'Proses...' : 'Buka Bungkus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
