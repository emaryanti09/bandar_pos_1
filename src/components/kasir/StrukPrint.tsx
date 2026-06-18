'use client'

import { X, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { Transaction, StoreSettings } from '@/types'

interface Props {
  transaction: Transaction
  storeSettings: StoreSettings | null
  onClose: () => void
}

export default function StrukPrint({ transaction, storeSettings, onClose }: Props) {
  function handlePrint() {
    const items = transaction.transaction_items || []
    const storeName = storeSettings?.store_name || 'Bandar POS'
    const address = storeSettings?.address || ''
    const wa = storeSettings?.whatsapp || ''
    const footer = storeSettings?.footer_note || 'Terima kasih!'
    const sep = '================================'

    const rows = items.map(item => `
      <div style="margin-bottom:4px">
        <div style="font-weight:600">${item.product_name}</div>
        <div style="display:flex;justify-content:space-between;color:#555">
          <span>${item.quantity} x ${formatRupiah(item.price)}</span>
          <span>${formatRupiah(item.subtotal)}</span>
        </div>
      </div>`).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Struk ${transaction.invoice_no}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: monospace; font-size: 9pt; width: 58mm; padding: 2mm; line-height: 1.4; }
    .center { text-align: center; }
    .row { display: flex; justify-content: space-between; }
    .bold { font-weight: bold; }
    .sep { margin: 4px 0; }
    .footer { text-align: center; color: #666; margin-top: 6px; }
    @media print { @page { size: 58mm auto; margin: 0; } body { padding: 1mm; } }
  </style>
</head>
<body>
  <div class="center">
    <div class="bold" style="font-size:11pt">${storeName}</div>
    ${address ? `<div>${address}</div>` : ''}
    ${wa ? `<div>WA: ${wa}</div>` : ''}
  </div>
  <div class="sep">${sep}</div>
  <div class="row"><span>No</span><span>${transaction.invoice_no}</span></div>
  <div class="row"><span>Kasir</span><span>${transaction.profiles?.full_name || '-'}</span></div>
  <div class="row"><span>Tgl</span><span>${formatDate(transaction.created_at)}</span></div>
  <div class="sep">${sep}</div>
  <div style="margin:6px 0">${rows}</div>
  <div class="sep">${sep}</div>
  <div class="row bold" style="font-size:10pt"><span>TOTAL</span><span>${formatRupiah(transaction.total)}</span></div>
  <div class="row"><span>${transaction.payment_method === 'cash' ? 'Cash' : 'QRIS'}</span><span>${formatRupiah(transaction.paid)}</span></div>
  ${transaction.payment_method === 'cash' ? `<div class="row"><span>Kembali</span><span>${formatRupiah(transaction.change)}</span></div>` : ''}
  <div class="sep">${sep}</div>
  <div class="footer">${footer}</div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=300,height=600')
    if (!win) { toast.error('Popup diblokir browser. Izinkan popup untuk print.'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const items = transaction.transaction_items || []

  return (
    <>
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
