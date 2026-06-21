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

const W = 32 // lebar baris monospace (58mm ≈ 32 char Courier 12px)

function padLine(left: string, right: string): string {
  const gap = W - left.length - right.length
  return left + (gap > 0 ? ' '.repeat(gap) : ' ') + right
}

function sepLine(char: string): string {
  return char.repeat(W)
}

function center(text: string): string {
  const pad = Math.max(0, Math.floor((W - text.length) / 2))
  return ' '.repeat(pad) + text
}

function buildStrukHtml(transaction: Transaction, storeSettings: StoreSettings | null): string {
  const items = transaction.transaction_items || []
  const storeName = storeSettings?.store_name || 'Bandar Frozen Food'
  const address = storeSettings?.address || ''
  const wa = storeSettings?.whatsapp || ''
  const footer = storeSettings?.footer_note || 'Terima kasih sudah berbelanja!'

  const rows = items.map(item => {
    const harga = formatRupiah(item.price).replace('Rp ', '').replace('Rp ', '')
    const detailLeft = `  ${item.quantity} x ${harga}`
    const detailRight = formatRupiah(item.subtotal)
    return `<div class="item-name">${item.product_name}</div><div class="item-detail">${padLine(detailLeft, detailRight)}</div><div style="height:3px"></div>`
  }).join('')

  const noLine    = padLine('No    :', transaction.invoice_no)
  const kasirLine = padLine('Kasir :', transaction.profiles?.full_name || '-')
  const tglLine   = padLine('Tgl   :', formatDate(transaction.created_at))
  const totalLine = padLine('TOTAL :', formatRupiah(transaction.total))
  const metodeLine = padLine(
    transaction.payment_method === 'cash' ? 'Cash   :' : 'QRIS   :',
    formatRupiah(transaction.paid)
  )
  const kembaliLine = transaction.payment_method === 'cash'
    ? `<div class="pay-line">${padLine('Kembali:', formatRupiah(transaction.change))}</div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Struk ${transaction.invoice_no}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:54mm; }
    body {
      font-family:'Courier New',Courier,monospace;
      font-size:12px;
      line-height:1.55;
      padding:4mm 2mm 10mm 3mm;
      color:#000;
    }
    .store-name { font-size:16px; font-weight:900; text-align:center; letter-spacing:1px; margin-bottom:1px; }
    .sub-header { font-size:11px; text-align:center; }
    .sep        { font-size:12px; white-space:pre; }
    .meta       { font-size:12px; white-space:pre; }
    .item-name  { font-size:12px; font-weight:900; word-break:break-word; }
    .item-detail{ font-size:12px; white-space:pre; }
    .total-block{ font-size:16px; font-weight:900; white-space:pre; margin:2px 0; }
    .pay-line   { font-size:12px; font-weight:700; white-space:pre; }
    .footer     { font-size:11px; text-align:center; margin-top:5px; }
    @media print {
      @page { size:58mm auto; margin:0mm; }
      html,body { width:54mm; padding:3mm 2mm 8mm 3mm; }
    }
  </style>
</head>
<body>
<div class="store-name">${storeName}</div>
${address ? `<div class="sub-header">${address}</div>` : ''}
${wa ? `<div class="sub-header">WA: ${wa}</div>` : ''}
<div class="sep">${sepLine('=')}</div>
<div class="meta">${noLine}</div>
<div class="meta">${kasirLine}</div>
<div class="meta">${tglLine}</div>
<div class="sep">${sepLine('-')}</div>
${rows}
<div class="sep">${sepLine('-')}</div>
<div class="total-block">${totalLine}</div>
<div class="sep">${sepLine('-')}</div>
<div class="pay-line">${metodeLine}</div>
${kembaliLine}
<div class="sep">${sepLine('=')}</div>
<div class="footer">${footer}</div>
</body>
</html>`
}

function buildPreviewText(transaction: Transaction, storeSettings: StoreSettings | null): string {
  const items = transaction.transaction_items || []
  const storeName = storeSettings?.store_name || 'Bandar Frozen Food'
  const address = storeSettings?.address || ''
  const wa = storeSettings?.whatsapp || ''
  const footer = storeSettings?.footer_note || 'Terima kasih sudah berbelanja!'

  const lines: string[] = [
    center(storeName),
    ...(address ? [center(address)] : []),
    ...(wa ? [center('WA: ' + wa)] : []),
    sepLine('='),
    padLine('No    :', transaction.invoice_no),
    padLine('Kasir :', transaction.profiles?.full_name || '-'),
    padLine('Tgl   :', formatDate(transaction.created_at)),
    sepLine('-'),
    ...items.flatMap(item => {
      const harga = formatRupiah(item.price).replace('Rp ', '').replace('Rp ', '')
      return [
        item.product_name,
        padLine(`  ${item.quantity} x ${harga}`, formatRupiah(item.subtotal)),
      ]
    }),
    sepLine('-'),
    padLine('TOTAL :', formatRupiah(transaction.total)),
    sepLine('-'),
    padLine(transaction.payment_method === 'cash' ? 'Cash   :' : 'QRIS   :', formatRupiah(transaction.paid)),
    ...(transaction.payment_method === 'cash' ? [padLine('Kembali:', formatRupiah(transaction.change))] : []),
    sepLine('='),
    center(footer),
  ]

  return lines.join('\n')
}

export default function StrukPrint({ transaction, storeSettings, onClose }: Props) {
  const previewText = buildPreviewText(transaction, storeSettings)

  function handlePrint() {
    const html = buildStrukHtml(transaction, storeSettings)
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:58mm;border:none;'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) { toast.error('Gagal membuat frame print'); document.body.removeChild(iframe); return }
    doc.open(); doc.write(html); doc.close()
    iframe.contentWindow?.addEventListener('load', () => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print() }
      finally { setTimeout(() => document.body.removeChild(iframe), 1000) }
    })
  }

  function handlePreview() {
    const html = buildStrukHtml(transaction, storeSettings)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) { toast.error('Popup diblokir. Izinkan popup di browser.'); URL.revokeObjectURL(url) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-900">Struk Pembayaran</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Preview monospace — sama persis dengan hasil print */}
        <div className="p-4 overflow-y-auto max-h-[60vh] bg-white">
          <pre className="font-mono text-[10.5px] leading-[1.55] whitespace-pre text-black overflow-x-auto">
            {previewText}
          </pre>
        </div>

        <div className="p-4 border-t space-y-2">
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
          <button onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 text-sm">
            <Printer className="w-4 h-4" /> Print 58mm
          </button>
        </div>
      </div>
    </div>
  )
}
