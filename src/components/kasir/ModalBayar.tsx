'use client'

import { useState } from 'react'
import { X, Banknote, QrCode, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import type { CartItem, Transaction } from '@/types'
import { formatRupiah } from '@/lib/utils'

interface Props {
  cart: CartItem[]
  subtotal: number
  showOngkir?: boolean
  onClose: () => void
  onSuccess: (transaction: Transaction) => void
}

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000]

export default function ModalBayar({ cart, subtotal, showOngkir = false, onClose, onSuccess }: Props) {
  const [method, setMethod] = useState<'cash' | 'qris'>('cash')
  const [paid, setPaid] = useState('')
  const [loading, setLoading] = useState(false)
  const [dikirim, setDikirim] = useState(false)
  const [ongkir, setOngkir] = useState('')

  const ongkirNum = dikirim ? (parseInt(ongkir) || 0) : 0
  const total = subtotal + ongkirNum
  const paidNum = parseFloat(paid) || 0
  const change = paidNum - total

  async function handleBayar() {
    if (method === 'cash' && paidNum < total) {
      toast.error('Uang bayar kurang'); return
    }

    setLoading(true)
    type SaleItem = {
      product_id: string | null
      product_name: string
      product_barcode: string | null
      unit: string
      price: number
      quantity: number
      subtotal: number
    }
    const items: SaleItem[] = cart.map(i => ({
      product_id: i.product.id,
      product_name: i.product.name,
      product_barcode: i.product.barcode,
      unit: i.product.unit_small || i.product.unit,
      price: i.product.price,
      quantity: i.quantity,
      subtotal: i.subtotal,
    }))

    if (dikirim && ongkirNum > 0) {
      items.push({
        product_id: null,
        product_name: 'Ongkos Kirim',
        product_barcode: null,
        unit: 'pcs',
        price: ongkirNum,
        quantity: 1,
        subtotal: ongkirNum,
      })
    }

    const res = await fetch('/api/transaksi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_method: method,
        subtotal,
        discount: 0,
        total,
        paid: method === 'qris' ? total : paidNum,
        change: method === 'qris' ? 0 : change,
        note: dikirim ? 'Dikirim' : null,
        items,
      }),
    })

    const result = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(result.error || 'Gagal proses transaksi'); return }
    toast.success('Transaksi berhasil!')
    onSuccess(result.data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-900">Pembayaran</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Toggle Dikirim */}
          {showOngkir && (
            <div className="space-y-2">
              <button
                onClick={() => { setDikirim(d => !d); setOngkir('') }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${dikirim ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Truck className="w-4 h-4" />
                  Dikirim
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative ${dikirim ? 'bg-blue-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${dikirim ? 'left-5' : 'left-1'}`} />
                </div>
              </button>
              {dikirim && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ongkos Kirim (Rp)</label>
                  <input
                    type="number"
                    value={ongkir}
                    onChange={e => setOngkir(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-bold text-gray-900"
                    placeholder="0"
                    min={0}
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-sm text-red-600 font-medium">Total Tagihan</p>
            <p className="text-3xl font-bold text-red-700">{formatRupiah(total)}</p>
            {dikirim && ongkirNum > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Produk {formatRupiah(subtotal)} + Ongkir {formatRupiah(ongkirNum)}
              </p>
            )}
          </div>

          {/* Metode */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMethod('cash')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium transition-colors ${method === 'cash' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <Banknote className="w-5 h-5" /> Cash
              </button>
              <button
                onClick={() => setMethod('qris')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium transition-colors ${method === 'qris' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <QrCode className="w-5 h-5" /> QRIS
              </button>
            </div>
          </div>

          {method === 'cash' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uang Diterima</label>
                <input
                  type="number"
                  value={paid}
                  onChange={e => setPaid(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-xl font-bold text-gray-900"
                  placeholder="0"
                  min={total}
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.filter(a => a >= total || a === QUICK_AMOUNTS[QUICK_AMOUNTS.length - 1]).slice(0, 4).map(a => (
                  <button key={a} onClick={() => setPaid(String(a))}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-red-100 rounded-lg text-gray-700 font-medium transition-colors">
                    {formatRupiah(a)}
                  </button>
                ))}
                <button onClick={() => setPaid(String(total))}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-red-100 rounded-lg text-gray-700 font-medium transition-colors">
                  Pas
                </button>
              </div>
              {paidNum > 0 && (
                <div className={`flex justify-between items-center py-2 px-4 rounded-xl font-bold text-lg ${change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  <span>Kembalian</span>
                  <span>{change >= 0 ? formatRupiah(change) : `- ${formatRupiah(Math.abs(change))}`}</span>
                </div>
              )}
            </>
          )}

          {method === 'qris' && (
            <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-500">
              <QrCode className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>Konfirmasi setelah customer melakukan pembayaran QRIS</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">
              Batal
            </button>
            <button
              onClick={handleBayar}
              disabled={loading || (method === 'cash' && (paidNum === 0 || change < 0))}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-40 transition-colors"
            >
              {loading ? 'Proses...' : 'Bayar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
