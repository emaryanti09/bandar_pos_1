'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

interface Props {
  initialBarcode?: string
  onClose: () => void
  onSaved: (product: Product) => void
}

export default function ModalTambahProduk({ initialBarcode = '', onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    barcode: initialBarcode,
    name: '',
    unit: 'pcs',
    unit_small: '',
    unit_conversion: '',
    price: '',
    stock: '',
    stock_min: '5',
    expired_at: '',
  })
  const [loading, setLoading] = useState(false)

  function set(field: string, val: string) {
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
      unit_conversion: form.unit_conversion ? parseInt(form.unit_conversion) : 1,
      price: parseFloat(form.price),
      stock: form.stock ? parseInt(form.stock) : 0,
      stock_min: parseInt(form.stock_min) || 5,
      expired_at: form.expired_at || null,
    }

    const res = await fetch('/api/produk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await res.json()
    setLoading(false)

    if (!res.ok) { toast.error(result.error || 'Gagal menyimpan'); return }
    toast.success('Produk berhasil ditambahkan')
    onSaved(result.data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-900">Tambah Produk Baru</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
              <input value={form.barcode} onChange={e => set('barcode', e.target.value)}
                className="input" placeholder="Opsional" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="input" placeholder="Indomie Goreng" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Satuan Besar</label>
              <input value={form.unit} onChange={e => set('unit', e.target.value)}
                className="input" placeholder="dus" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Satuan Kecil (jual)</label>
              <input value={form.unit_small} onChange={e => set('unit_small', e.target.value)}
                className="input" placeholder="pcs" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">1 {form.unit || 'besar'} = ? {form.unit_small || 'kecil'}</label>
              <input type="number" value={form.unit_conversion} onChange={e => set('unit_conversion', e.target.value)}
                className="input" placeholder="12" min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual (per kecil) *</label>
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
                className="input" placeholder="3000" min="0" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label>
              <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)}
                className="input" placeholder="0" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min. Stok</label>
              <input type="number" value={form.stock_min} onChange={e => set('stock_min', e.target.value)}
                className="input" placeholder="5" min="0" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kadaluarsa</label>
              <input type="date" value={form.expired_at} onChange={e => set('expired_at', e.target.value)}
                className="input" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">
              Batal
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-60">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
