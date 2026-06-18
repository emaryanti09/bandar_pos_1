'use client'

import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

interface Props {
  product: Product | null
  onClose: () => void
  onSaved: () => void
}

export default function ModalProduk({ product, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    kode: '', barcode: '', name: '', unit: 'pcs', unit_small: '', unit_conversion: '1',
    price: '', stock: '0', stock_min: '5', expired_at: '', active: true,
    linked_product_id: '', linked_qty: '1',
  })
  const [linkedSearch, setLinkedSearch] = useState('')
  const [linkedResults, setLinkedResults] = useState<Product[]>([])
  const [linkedSelected, setLinkedSelected] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        kode: product.kode || '',
        barcode: product.barcode || '',
        name: product.name,
        unit: product.unit,
        unit_small: product.unit_small || '',
        unit_conversion: String(product.unit_conversion || 1),
        price: String(product.price),
        stock: String(product.stock),
        stock_min: String(product.stock_min),
        expired_at: product.expired_at || '',
        active: product.active,
        linked_product_id: product.linked_product_id || '',
        linked_qty: String(product.linked_qty || 1),
      })
      // Load linked product info jika ada
      if (product.linked_product_id) {
        fetch(`/api/produk/${product.linked_product_id}`)
          .then(r => r.json())
          .then(({ data }) => { if (data) setLinkedSelected(data) })
      }
    }
  }, [product])

  function set(field: string, val: string | boolean) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleLinkedSearch(q: string) {
    setLinkedSearch(q)
    if (!q.trim()) { setLinkedResults([]); return }
    const res = await fetch(`/api/produk?search=${encodeURIComponent(q)}&limit=8`)
    const { data } = await res.json()
    // Jangan tampilkan produk itu sendiri
    setLinkedResults((data || []).filter((p: Product) => p.id !== product?.id))
  }

  function selectLinked(p: Product) {
    setLinkedSelected(p)
    setForm(prev => ({ ...prev, linked_product_id: p.id }))
    setLinkedSearch('')
    setLinkedResults([])
  }

  function clearLinked() {
    setLinkedSelected(null)
    setForm(prev => ({ ...prev, linked_product_id: '', linked_qty: '1' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.price) { toast.error('Nama & harga wajib diisi'); return }
    setLoading(true)

    const body = {
      kode: form.kode || null,
      barcode: form.barcode || null,
      name: form.name,
      unit: form.unit,
      unit_small: form.unit_small || null,
      unit_conversion: parseInt(form.unit_conversion) || 1,
      price: parseFloat(form.price),
      stock: parseInt(form.stock) || 0,
      stock_min: parseInt(form.stock_min) || 5,
      expired_at: form.expired_at || null,
      active: form.active,
      linked_product_id: form.linked_product_id || null,
      linked_qty: form.linked_product_id ? (parseInt(form.linked_qty) || 1) : 1,
    }

    const url = product ? `/api/produk/${product.id}` : '/api/produk'
    const method = product ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await res.json()
    setLoading(false)

    if (!res.ok) { toast.error(result.error || 'Gagal menyimpan'); return }
    toast.success(product ? 'Produk diperbarui' : 'Produk ditambahkan')
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-bold text-lg text-gray-900">{product ? 'Edit Produk' : 'Tambah Produk'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kode Produk (SKU)</label>
              <input value={form.kode} onChange={e => set('kode', e.target.value.toUpperCase())} className="input font-mono" placeholder="BRS-001" />
            </div>
            <div>
              <label className="label">Barcode</label>
              <input value={form.barcode} onChange={e => set('barcode', e.target.value)} className="input" placeholder="Opsional" />
            </div>
          </div>
          <div>
            <label className="label">Nama Produk *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Satuan Besar</label>
              <input value={form.unit} onChange={e => set('unit', e.target.value)} className="input" placeholder="dus" />
            </div>
            <div>
              <label className="label">Satuan Kecil (jual)</label>
              <input value={form.unit_small} onChange={e => set('unit_small', e.target.value)} className="input" placeholder="pcs" />
            </div>
            <div>
              <label className="label">Konversi (1 besar = ? kecil)</label>
              <input type="number" value={form.unit_conversion} onChange={e => set('unit_conversion', e.target.value)} className="input" min="1" />
            </div>
            <div>
              <label className="label">Harga Jual *</label>
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)} className="input" min="0" required />
            </div>
            <div>
              <label className="label">Stok</label>
              <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)} className="input" min="0" />
            </div>
            <div>
              <label className="label">Min. Stok</label>
              <input type="number" value={form.stock_min} onChange={e => set('stock_min', e.target.value)} className="input" min="0" />
            </div>
          </div>
          <div>
            <label className="label">Kadaluarsa</label>
            <input type="date" value={form.expired_at} onChange={e => set('expired_at', e.target.value)} className="input" />
          </div>

          {/* Linked product untuk buka bungkus cross-product */}
          <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Pecahan Produk <span className="text-xs text-gray-400 font-normal">(opsional)</span></p>
              <p className="text-xs text-gray-400 mt-0.5">Jika produk ini bisa dipecah ke produk lain. Contoh: Beras 1kg → Beras 250g</p>
            </div>

            {linkedSelected ? (
              <div className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{linkedSelected.name}</p>
                  <p className="text-xs text-gray-500">{linkedSelected.unit_small || linkedSelected.unit}</p>
                </div>
                <button type="button" onClick={clearLinked} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={linkedSearch}
                  onChange={e => handleLinkedSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Cari produk hasil pecahan..."
                />
                {linkedResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                    {linkedResults.map(p => (
                      <button key={p.id} type="button" onClick={() => selectLinked(p)}
                        className="w-full px-3 py-2.5 hover:bg-amber-50 text-left border-b last:border-0 text-sm">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.unit_small || p.unit}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {linkedSelected && (
              <div>
                <label className="label">1 {form.unit || 'unit besar'} = berapa {linkedSelected.unit_small || linkedSelected.unit}?</label>
                <input
                  type="number"
                  value={form.linked_qty}
                  onChange={e => set('linked_qty', e.target.value)}
                  className="input"
                  min="1"
                  placeholder="4"
                />
              </div>
            )}
          </div>

          {product && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700">Produk aktif</span>
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
