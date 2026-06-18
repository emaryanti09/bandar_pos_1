'use client'

import { useState } from 'react'
import { X, Search, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product } from '@/types'
import { formatRupiah } from '@/lib/utils'

interface Batch {
  qty: string
  expired_at: string
  note: string
}

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function ModalPembelian({ onClose, onSaved }: Props) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [batches, setBatches] = useState<Batch[]>([{ qty: '1', expired_at: '', note: '' }])
  const [loading, setLoading] = useState(false)

  async function handleSearch(q: string) {
    setSearch(q)
    if (!q.trim()) { setResults([]); return }
    const res = await fetch(`/api/produk?search=${encodeURIComponent(q)}&limit=8`)
    const { data } = await res.json()
    setResults(data || [])
  }

  function setBatch(index: number, field: keyof Batch, value: string) {
    setBatches(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b))
  }

  function addBatch() {
    setBatches(prev => [...prev, { qty: '1', expired_at: '', note: '' }])
  }

  function removeBatch(index: number) {
    if (batches.length === 1) return
    setBatches(prev => prev.filter((_, i) => i !== index))
  }

  const totalQty = batches.reduce((s, b) => s + (parseInt(b.qty) || 0), 0)

  async function handleSimpan() {
    if (!selected) { toast.error('Pilih produk terlebih dahulu'); return }
    if (totalQty < 1) { toast.error('Total qty harus lebih dari 0'); return }

    const invalidBatch = batches.find(b => !b.qty || parseInt(b.qty) < 1)
    if (invalidBatch) { toast.error('Semua batch harus memiliki qty minimal 1'); return }

    setLoading(true)
    const res = await fetch('/api/stok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: selected.id,
        type: 'adjustment',
        batches: batches.map(b => ({
          qty: parseInt(b.qty),
          expired_at: b.expired_at || null,
          note: b.note || `Pembelian +${b.qty} ${selected.unit_small || selected.unit}`,
        })),
      }),
    })

    const result = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(result.error || 'Gagal menyimpan'); return }
    toast.success(`+${totalQty} stok ditambahkan untuk ${selected.name}`)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-900">Tambah Stok (Pembelian)</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Cari produk */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Cari produk..."
              disabled={!!selected}
            />
          </div>

          {results.length > 0 && !selected && (
            <div className="border border-gray-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {results.map(p => (
                <button key={p.id} onClick={() => { setSelected(p); setResults([]) }}
                  className="w-full px-4 py-3 hover:bg-blue-50 text-left border-b last:border-0 text-sm">
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">Stok: {p.stock} {p.unit_small || p.unit} · {formatRupiah(p.price)}</p>
                </button>
              ))}
            </div>
          )}

          {/* Produk terpilih */}
          {selected && (
            <>
              <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">{selected.name}</p>
                  <p className="text-sm text-gray-500">Stok saat ini: <strong>{selected.stock}</strong> {selected.unit_small || selected.unit}</p>
                </div>
                <button onClick={() => { setSelected(null); setSearch(''); setBatches([{ qty: '1', expired_at: '', note: '' }]) }}
                  className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Header kolom */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                <div className="col-span-2">Qty</div>
                <div className="col-span-4">Kadaluarsa</div>
                <div className="col-span-5">Catatan</div>
                <div className="col-span-1"></div>
              </div>

              {/* Batch rows */}
              <div className="space-y-2">
                {batches.map((batch, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="number"
                      value={batch.qty}
                      onChange={e => setBatch(i, 'qty', e.target.value)}
                      min="1"
                      className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={batch.expired_at}
                      onChange={e => setBatch(i, 'expired_at', e.target.value)}
                      className="col-span-4 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={batch.note}
                      onChange={e => setBatch(i, 'note', e.target.value)}
                      placeholder="Supplier, faktur..."
                      className="col-span-5 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeBatch(i)}
                      disabled={batches.length === 1}
                      className="col-span-1 flex justify-center text-gray-300 hover:text-red-500 disabled:opacity-0 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Tambah batch */}
              <button
                onClick={addBatch}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Tambah Batch
              </button>

              {/* Ringkasan */}
              <div className="bg-green-50 rounded-xl px-4 py-3 text-sm text-center text-green-700">
                Total tambah: <strong>{totalQty} {selected.unit_small || selected.unit}</strong>
                {' '}→ Stok baru: <strong>{selected.stock + totalQty} {selected.unit_small || selected.unit}</strong>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">
              Batal
            </button>
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
