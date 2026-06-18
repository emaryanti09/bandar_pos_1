'use client'

import { useState } from 'react'
import { X, Search, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

type Mode = 'satuan' | 'cross'

export default function ModalBukaBungkus({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('cross')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [linkedProduct, setLinkedProduct] = useState<Product | null>(null)
  const [qty, setQty] = useState('1')
  const [loading, setLoading] = useState(false)

  async function handleSearch(q: string) {
    setSearch(q)
    if (!q.trim()) { setResults([]); return }
    const res = await fetch(`/api/produk?search=${encodeURIComponent(q)}&limit=10`)
    const { data } = await res.json()
    const all: Product[] = data || []

    if (mode === 'cross') {
      setResults(all.filter(p => p.linked_product_id))
    } else {
      setResults(all.filter(p => p.unit_conversion > 1 && !p.linked_product_id))
    }
  }

  async function handleSelect(p: Product) {
    setSelected(p)
    setResults([])
    if (mode === 'cross' && p.linked_product_id) {
      const res = await fetch(`/api/produk/${p.linked_product_id}`)
      const { data } = await res.json()
      setLinkedProduct(data || null)
    }
  }

  function handleReset() {
    setSelected(null)
    setLinkedProduct(null)
    setSearch('')
    setQty('1')
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

    if (mode === 'cross' && linkedProduct) {
      toast.success(`${selected.name} -${qtyNum} → ${linkedProduct.name} +${qtyNum * selected.linked_qty}`)
    } else {
      toast.success(`Berhasil buka ${qtyNum} ${selected.unit} → +${qtyNum * selected.unit_conversion} ${selected.unit_small || 'pcs'}`)
    }
    onClose()
  }

  const qtyNum = parseInt(qty || '0')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-900">Buka Bungkus</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => { setMode('cross'); handleReset() }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${mode === 'cross' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Pecah Produk
            </button>
            <button
              onClick={() => { setMode('satuan'); handleReset() }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${mode === 'satuan' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Buka Satuan
            </button>
          </div>

          {/* Keterangan mode */}
          <p className="text-xs text-gray-400">
            {mode === 'cross'
              ? 'Kurangi stok produk besar, tambah stok produk kecil. Contoh: Beras 1kg → Beras 250g'
              : 'Tambah stok satuan kecil dari produk yang sama. Contoh: 1 dus Indomie → +40 pcs'}
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              disabled={!!selected}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm disabled:bg-gray-50"
              placeholder={mode === 'cross' ? 'Cari produk besar...' : 'Cari produk dengan satuan besar...'}
            />
          </div>

          {/* Hasil search */}
          {results.length > 0 && !selected && (
            <div className="border border-gray-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {results.map(p => (
                <button key={p.id} onClick={() => handleSelect(p)}
                  className="w-full px-4 py-3 hover:bg-amber-50 text-left border-b last:border-0 text-sm">
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {mode === 'cross'
                      ? `Stok: ${p.stock} ${p.unit} · dipecah menjadi ${p.linked_qty}x`
                      : `1 ${p.unit} = ${p.unit_conversion} ${p.unit_small} · Stok: ${p.stock}`}
                  </p>
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && search && !selected && (
            <p className="text-sm text-gray-400 text-center py-2">
              {mode === 'cross' ? 'Tidak ada produk dengan pecahan terdaftar' : 'Tidak ada produk dengan konversi satuan'}
            </p>
          )}

          {/* Detail produk terpilih */}
          {selected && (
            <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-100">
              {/* Info produk */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  {mode === 'cross' && linkedProduct ? (
                    <div className="flex items-center gap-2 text-sm">
                      <div>
                        <p className="font-semibold text-gray-900">{selected.name}</p>
                        <p className="text-xs text-gray-500">Stok: {selected.stock} {selected.unit}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900">{linkedProduct.name}</p>
                        <p className="text-xs text-gray-500">Stok: {linkedProduct.stock} {linkedProduct.unit_small || linkedProduct.unit}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-gray-900">{selected.name}</p>
                      <p className="text-sm text-gray-500">1 {selected.unit} = {selected.unit_conversion} {selected.unit_small}</p>
                      <p className="text-sm text-gray-500">Stok: {selected.stock}</p>
                    </div>
                  )}
                  {mode === 'cross' && (
                    <p className="text-xs text-amber-700">1 {selected.unit} → {selected.linked_qty}x {linkedProduct?.unit_small || linkedProduct?.unit}</p>
                  )}
                </div>
                <button onClick={handleReset} className="text-gray-400 hover:text-gray-600 ml-2">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Input qty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah {selected.unit} dibuka
                </label>
                <input
                  type="number"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-center text-xl font-bold"
                  min="1"
                  max={mode === 'cross' ? selected.stock : undefined}
                  autoFocus
                />
              </div>

              {/* Preview perubahan stok */}
              <div className="bg-white rounded-lg p-3 text-sm space-y-1">
                {mode === 'cross' && linkedProduct ? (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>{selected.name}</span>
                      <span className="text-red-600 font-medium">{selected.stock} → {selected.stock - qtyNum}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>{linkedProduct.name}</span>
                      <span className="text-green-600 font-medium">{linkedProduct.stock} → {linkedProduct.stock + qtyNum * selected.linked_qty}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-600">
                    Stok bertambah: <strong className="text-green-600">+{qtyNum * selected.unit_conversion} {selected.unit_small}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">
              Batal
            </button>
            <button
              onClick={handleBukaBungkus}
              disabled={!selected || loading || (mode === 'cross' && qtyNum > selected.stock)}
              className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-40 transition-colors"
            >
              {loading ? 'Proses...' : 'Buka Bungkus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
