'use client'

import { X, Printer } from 'lucide-react'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { Transaction, StoreSettings } from '@/types'

interface Props {
  transaction: Transaction
  storeSettings: StoreSettings | null
  onClose: () => void
}

export default function StrukPrint({ transaction, storeSettings, onClose }: Props) {
  function handlePrint() {
    window.print()
  }

  const items = transaction.transaction_items || []

  return (
    <>
      {/* Print styles injected globally */}
      <style>{`
        @media print {
          @page { size: 58mm auto; margin: 0; }
          body > *:not(#struk-modal) { display: none !important; }
          #struk-modal { position: fixed; inset: 0; background: white; z-index: 9999; display: flex !important; align-items: flex-start; justify-content: center; padding: 0; }
          .no-print { display: none !important; }
          #struk-content { width: 58mm; font-family: monospace; font-size: 9px; padding: 2mm; line-height: 1.3; }
        }
      `}</style>

      <div id="struk-modal" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b no-print">
            <h2 className="font-bold text-gray-900">Struk Pembayaran</h2>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
          </div>

          <div id="struk-content" className="p-4 font-mono text-xs">
            {/* Header toko */}
            <div className="text-center mb-3">
              <p className="font-bold text-sm">{storeSettings?.store_name || 'Bandar POS'}</p>
              {storeSettings?.address && <p>{storeSettings.address}</p>}
              {storeSettings?.whatsapp && <p>WA: {storeSettings.whatsapp}</p>}
              <p className="mt-1">{'='.repeat(32)}</p>
            </div>

            {/* Info transaksi */}
            <div className="mb-2">
              <div className="flex justify-between"><span>No</span><span>{transaction.invoice_no}</span></div>
              <div className="flex justify-between"><span>Kasir</span><span>{transaction.profiles?.full_name || '-'}</span></div>
              <div className="flex justify-between"><span>Tgl</span><span>{formatDate(transaction.created_at)}</span></div>
            </div>
            <p>{'='.repeat(32)}</p>

            {/* Items */}
            <div className="my-2 space-y-1">
              {items.map((item, i) => (
                <div key={i}>
                  <p className="font-medium truncate">{item.product_name}</p>
                  <div className="flex justify-between text-gray-600">
                    <span>{item.quantity} x {formatRupiah(item.price)}</span>
                    <span>{formatRupiah(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
            <p>{'='.repeat(32)}</p>

            {/* Total */}
            <div className="my-2 space-y-0.5">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL</span><span>{formatRupiah(transaction.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>{transaction.payment_method === 'cash' ? 'Cash' : 'QRIS'}</span>
                <span>{formatRupiah(transaction.paid)}</span>
              </div>
              {transaction.payment_method === 'cash' && (
                <div className="flex justify-between">
                  <span>Kembali</span><span>{formatRupiah(transaction.change)}</span>
                </div>
              )}
            </div>
            <p>{'='.repeat(32)}</p>

            {/* Footer */}
            <p className="text-center mt-2 text-gray-500">{storeSettings?.footer_note || 'Terima kasih!'}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-4 border-t no-print">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">
              Tutup
            </button>
            <button onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
