'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Banknote, QrCode, Truck, Plus, Minus, Trash2, Search, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Transaction, TransactionItem, Product } from '@/types'
import { formatRupiah } from '@/lib/utils'

interface EditItem {
  product_id: string | null
  product_name: string
  product_barcode: string | null
  unit: string
  price: number
  quantity: number
  subtotal: number
}

interface Props {
  transaction: Transaction
  onClose: () => void
  onSuccess: (updated: Transaction) => void
}

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000]

export default function ModalEditTransaksi({ transaction, onClose, onSuccess }: Props) {
  const [items, setItems] = useState<EditItem[]>([])
  const [method, setMethod] = useState<'cash' | 'qris'>(transaction.payment_method)
  const [paid, setPaid] = useState(String(transaction.paid))
  const [dikirim, setDikirim] = useState(transaction.note === 'Dikirim')
  const [ongkir, setOngkir] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Inisialisasi items dari transaksi, pisahkan ongkir
  useEffect(() => {
    const txItems = transaction.transaction_items || []
    const ongkirItem = txItems.find(i => i.product_id === null && i.product_name === 'Ongkos Kirim')
    const productItems = txItems.filter(i => !(i.product_id === null && i.product_name === 'Ongkos Kirim'))

    setItems(productItems.map(i => ({
      product_id: i.product_id,
      product_name: i.product_name,
      product_barcode: i.product_barcode,
      unit: i.unit,
      price: i.price,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })))

    if (ongkirItem) {
      setDikirim(true)
      setOngkir(String(ongkirItem.price))
    }
  }, [transaction])

  const productSubtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const ongkirNum = dikirim ? (parseInt(ongkir) || 0) : 0
  const total = productSubtotal + ongkirNum
  const paidNum = parseFloat(paid) || 0
  const change = paidNum - total

  // Search produk
  const fetchSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); setShowSearch(false); return }
    const res = await fetch(`/api/produk?search=${encodeURIComponent(q)}&limit=8`)
    const { data } = await res.json()
    setSearchResults(data || [])
    setShowSearch(true)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchSearch(search), 250)
    return () => clearTimeout(t)
  }, [search, fetchSearch])

  function addProduct(product: Product) {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
          : i
        )
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        product_barcode: product.barcode,
        unit: product.unit_small || product.unit,
        price: product.price,
        quantity: 1,
        subtotal: product.price,
      }]
    })
    setSearch('')
    setShowSearch(false)
    searchRef.current?.focus()
  }

  function updateQty(idx: number, delta: number) {
    setItems(prev => prev
      .map((i, n) => n === idx ? { ...i, quantity: i.quantity + delta, subtotal: (i.quantity + delta) * i.price } : i)
      .filter(i => i.quantity > 0)
    )
  }

  function setQtyDirect(idx: number, qty: number) {
    if (qty < 1) { setItems(prev => prev.filter((_, n) => n !== idx)); return }
    setItems(prev => prev.map((i, n) => n === idx ? { ...i, quantity: qty, subtotal: qty * i.price } : i))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, n) => n !== idx))
  }

  async function handleSimpan() {
    if (items.length === 0) { toast.error('Minimal 1 item'); return }
    if (method === 'cash' && paidNum < total) { toast.error('Uang bayar kurang'); return }

    setLoading(true)
    const allItems = [...items]
    if (dikirim && ongkirNum > 0) {
      allItems.push({
        product_id: null,
        product_name: 'Ongkos Kirim',
        product_barcode: null,
        unit: 'pcs',
        price: ongkirNum,
        quantity: 1,
        subtotal: ongkirNum,
      })
    }

    const res = await fetch(`/api/transaksi/${transaction.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_method: method,
        subtotal: productSubtotal,
        discount: 0,
        total,
        paid: method === 'qris' ? total : paidNum,
        change: method === 'qris' ? 0 : change,
        note: dikirim ? 'Dikirim' : null,
        items: allItems,
      }),
    })

    const result = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(result.error || 'Gagal menyimpan'); return }
    toast.success('Transaksi berhasil diperbarui')
    onSuccess(result.data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <h2 className="font-bold text-lg text-gray-900">Edit Transaksi</h2>
            <p className="text-xs text-gray-400">{transaction.invoice_no}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Cari & tambah produk */}
          <div className="relative">
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-red-400">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => search && setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 150)}
                placeholder="Tambah produk..."
                className="flex-1 text-sm outline-none text-gray-900 bg-transparent"
              />
              {search && (
                <button onMouseDown={e => e.preventDefault()} onClick={() => { setSearch(''); setShowSearch(false) }}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            {showSearch && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto z-50">
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => addProduct(p)}
                    disabled={p.stock <= 0}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 border-b last:border-0 text-left disabled:opacity-40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{formatRupiah(p.price)} · Stok: {p.stock <= 0 ? 'Habis' : p.stock}</p>
                    </div>
                    <ScanLine className="w-4 h-4 text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Daftar item */}
          <div className="space-y-2">
            {items.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-4">Belum ada item — tambah produk di atas</p>
            )}
            {items.map((item, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-1">{item.product_name}</p>
                    <p className="text-xs text-gray-400">{formatRupiah(item.price)} / {item.unit}</p>
                  </div>
                  <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(idx, -1)}
                      className="w-8 h-8 rounded-full bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      min={1}
                      onChange={e => setQtyDirect(idx, parseInt(e.target.value) || 0)}
                      className="w-12 h-8 text-center font-bold text-gray-900 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                    />
                    <button
                      onClick={() => updateQty(idx, 1)}
                      className="w-8 h-8 rounded-full bg-white border border-gray-200 hover:bg-green-50 hover:text-green-600 flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-bold text-red-700">{formatRupiah(item.subtotal)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Ongkir toggle */}
          <div className="space-y-2">
            <button
              onClick={() => { setDikirim(d => !d); setOngkir('') }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${dikirim ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2 font-medium text-sm">
                <Truck className="w-4 h-4" /> Dikirim
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors relative ${dikirim ? 'bg-blue-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${dikirim ? 'left-5' : 'left-1'}`} />
              </div>
            </button>
            {dikirim && (
              <input
                type="number"
                value={ongkir}
                onChange={e => setOngkir(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-bold text-gray-900"
                placeholder="Ongkos Kirim (Rp)"
                min={0}
              />
            )}
          </div>

          {/* Total */}
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-sm text-red-600 font-medium">Total Tagihan</p>
            <p className="text-3xl font-bold text-red-700">{formatRupiah(total)}</p>
            {dikirim && ongkirNum > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Produk {formatRupiah(productSubtotal)} + Ongkir {formatRupiah(ongkirNum)}
              </p>
            )}
          </div>

          {/* Metode bayar */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMethod('cash')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium transition-colors ${method === 'cash' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'}`}
              >
                <Banknote className="w-5 h-5" /> Cash
              </button>
              <button
                onClick={() => setMethod('qris')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium transition-colors ${method === 'qris' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'}`}
              >
                <QrCode className="w-5 h-5" /> QRIS
              </button>
            </div>
          </div>

          {/* Uang diterima (cash) */}
          {method === 'cash' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Uang Diterima</label>
              <input
                type="number"
                value={paid}
                onChange={e => setPaid(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-xl font-bold text-gray-900"
                placeholder="0"
                min={total}
              />
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.filter(a => a >= total).slice(0, 3).map(a => (
                  <button key={a} onClick={() => setPaid(String(a))}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-red-100 rounded-lg text-gray-700 font-medium">
                    {formatRupiah(a)}
                  </button>
                ))}
                <button onClick={() => setPaid(String(total))}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-red-100 rounded-lg text-gray-700 font-medium">
                  Pas
                </button>
              </div>
              {paidNum > 0 && (
                <div className={`flex justify-between items-center py-2 px-4 rounded-xl font-bold ${change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  <span>Kembalian</span>
                  <span>{change >= 0 ? formatRupiah(change) : `- ${formatRupiah(Math.abs(change))}`}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">
            Batal
          </button>
          <button
            onClick={handleSimpan}
            disabled={loading || items.length === 0 || (method === 'cash' && (paidNum === 0 || change < 0))}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
