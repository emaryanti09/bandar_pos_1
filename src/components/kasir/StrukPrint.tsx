'use client'

import { X, Printer, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { Transaction, StoreSettings } from '@/types'

interface Props {
  transaction: Transaction
  storeSettings: StoreSettings | null
  onClose: () => void
}

function buildStrukHtml(transaction: Transaction, storeSettings: StoreSettings | null) {
  const items = transaction.transaction_items || []
  const storeName = storeSettings?.store_name || 'Bandar POS'
  const address = storeSettings?.address || ''
  const wa = storeSettings?.whatsapp || ''
  const footer = storeSettings?.footer_note || 'Terima kasih!'

  // Item: nama produk, lalu qty x harga = subtotal (semua satu lajur, tidak flex)
  const rows = items.map(item => `
    <div class="item">
      <div>${item.product_name}</div>
      <div class="indent">${item.quantity} x ${formatRupiah(item.price)} = <b>${formatRupiah(item.subtotal)}</b></div>
    </div>`).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Struk ${transaction.invoice_no}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 54mm; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 7.5pt;
      line-height: 1.5;
      padding: 2mm;
      color: #000;
      word-break: break-word;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .sep { border-top: 1px dashed #000; margin: 3px 0; }
    .store-name { font-size: 9.5pt; font-weight: bold; text-align: center; }
    .item { margin: 2px 0; }
    .indent { padding-left: 4px; color: #333; }
    .kv { display: block; }
    .kv-label { color: #555; }
    .total-line { font-weight: bold; font-size: 9pt; }
    .footer { text-align: center; margin-top: 4px; font-size: 7pt; color: #555; }
    @media print {
      @page { size: 58mm auto; margin: 0mm; }
      html, body { width: 54mm; padding: 1mm; }
    }
  </style>
</head>
<body>
  <div class="store-name">${storeName}</div>
  ${address ? `<div class="center">${address}</div>` : ''}
  ${wa ? `<div class="center">WA: ${wa}</div>` : ''}
  <div class="sep"></div>
  <div><span class="kv-label">No    : </span>${transaction.invoice_no}</div>
  <div><span class="kv-label">Kasir : </span>${transaction.profiles?.full_name || '-'}</div>
  <div><span class="kv-label">Tgl   : </span>${formatDate(transaction.created_at)}</div>
  <div class="sep"></div>
  ${rows}
  <div class="sep"></div>
  <div class="total-line">TOTAL  : ${formatRupiah(transaction.total)}</div>
  <div>${transaction.payment_method === 'cash' ? 'Cash' : 'QRIS'}   : ${formatRupiah(transaction.paid)}</div>
  ${transaction.payment_method === 'cash' ? `<div>Kembali: ${formatRupiah(transaction.change)}</div>` : ''}
  <div class="sep"></div>
  <div class="footer">${footer}</div>
</body>
</html>`
}

export default function StrukPrint({ transaction, storeSettings, onClose }: Props) {
  const items = transaction.transaction_items || []

  function handlePrint() {
    const html = buildStrukHtml(transaction, storeSettings)

    // Gunakan iframe tersembunyi — lebih akurat untuk ukuran kertas
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:58mm;border:none;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) { toast.error('Gagal membuat frame print'); document.body.removeChild(iframe); return }

    doc.open()
    doc.write(html)
    doc.close()

    iframe.contentWindow?.addEventListener('load', () => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } finally {
        setTimeout(() => document.body.removeChild(iframe), 1000)
      }
    })
  }

  // Preview di tab baru — untuk RawBT di HP: buka tab ini lalu share/print ke RawBT
  function handlePreview() {
    const html = buildStrukHtml(transaction, storeSettings)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) {
      toast.error('Popup diblokir. Izinkan popup di browser.')
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div id="struk-modal" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-900">Struk Pembayaran</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Preview struk di dalam modal */}
        <div className="p-4 font-mono text-xs overflow-y-auto max-h-[60vh]">
          <div className="text-center mb-2">
            <p className="font-bold text-sm">{storeSettings?.store_name || 'Bandar POS'}</p>
            {storeSettings?.address && <p>{storeSettings.address}</p>}
            {storeSettings?.whatsapp && <p>WA: {storeSettings.whatsapp}</p>}
          </div>
          <p className="border-t border-dashed border-gray-400 my-2" />

          <div className="space-y-0.5 mb-2">
            <div className="flex justify-between"><span>No</span><span className="truncate ml-2 text-right">{transaction.invoice_no}</span></div>
            <div className="flex justify-between"><span>Kasir</span><span>{transaction.profiles?.full_name || '-'}</span></div>
            <div className="flex justify-between"><span>Tgl</span><span>{formatDate(transaction.created_at)}</span></div>
          </div>
          <p className="border-t border-dashed border-gray-400 my-2" />

          <div className="space-y-1.5 mb-2">
            {items.map((item, i) => (
              <div key={i}>
                <p className="font-medium">{item.product_name}</p>
                <div className="flex justify-between text-gray-600">
                  <span>{item.quantity} x {formatRupiah(item.price)}</span>
                  <span>{formatRupiah(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="border-t border-dashed border-gray-400 my-2" />

          <div className="space-y-0.5">
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
          <p className="border-t border-dashed border-gray-400 my-2" />
          <p className="text-center text-gray-500 mt-1">{storeSettings?.footer_note || 'Terima kasih!'}</p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t space-y-2">
          {/* Baris 1: Tutup + Preview (untuk RawBT) */}
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 text-sm">
              Tutup
            </button>
            <button onClick={handlePreview}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 text-sm">
              <Eye className="w-4 h-4" /> Preview
            </button>
          </div>
          {/* Baris 2: Print (untuk printer 58mm desktop) */}
          <button onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 text-sm">
            <Printer className="w-4 h-4" /> Print 58mm
          </button>
        </div>
      </div>
    </div>
  )
}
