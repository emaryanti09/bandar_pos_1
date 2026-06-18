'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

interface Props {
  product: Product | null
  onClose: () => void
  onSaved: () => void
}

export default function ModalProduk({ product, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    barcode: '', name: '', unit: 'pcs', unit_small: '', unit_conversion: '1',
    price: '', stock: '0', stock_min: '5', expired_at: '', active: true,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
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
      })
    }
  }, [product])

  function set(field: string, val: string | boolean) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.price) { toast.error('Nama & harga wajib diisi'); return }
    setLoading(true)

    const body = {
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
          <div>
            <label className="label">Barcode</label>
            <input value={form.barcode} onChange={e => set('barcode', e.target.value)} className="input" placeholder="Opsional" />
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
