'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

interface Props {
  product: Product
  onClose: () => void
  onSaved: () => void
}

export default function ModalStokOpname({ product, onClose, onSaved }: Props) {
  const [qtyNew, setQtyNew] = useState(String(product.stock))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const qtyNewNum = parseInt(qtyNew) || 0
  const selisih = qtyNewNum - product.stock

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/stok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: product.id,
        type: 'opname',
        qty_new: qtyNewNum,
        note: note || `Opname: ${product.stock} → ${qtyNewNum}`,
      }),
    })

    const result = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(result.error || 'Gagal'); return }
    toast.success('Stock opname berhasil')
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-900">Stock Opname</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-semibold text-gray-900">{product.name}</p>
            <p className="text-sm text-gray-500">Stok sistem: <strong>{product.stock}</strong> {product.unit_small || product.unit}</p>
          </div>
          <div>
            <label className="label">Stok Aktual (hasil hitung fisik)</label>
            <input type="number" value={qtyNew} onChange={e => setQtyNew(e.target.value)}
              className="input text-center text-2xl font-bold" min="0" autoFocus />
          </div>
          {qtyNew !== '' && (
            <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-medium ${selisih > 0 ? 'bg-green-50 text-green-700' : selisih < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'}`}>
              {selisih === 0 ? 'Tidak ada selisih' : selisih > 0 ? `+${selisih} (stok bertambah)` : `${selisih} (stok berkurang/hilang)`}
            </div>
          )}
          <div>
            <label className="label">Catatan (opsional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} className="input" placeholder="Contoh: hilang, rusak, dll." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-60">
              {loading ? 'Menyimpan...' : 'Simpan Opname'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
