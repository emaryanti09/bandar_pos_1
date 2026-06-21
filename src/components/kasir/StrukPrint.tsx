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

function buildStrukHtml(transaction: Transaction, storeSettings: StoreSettings | null): string {
  const items = transaction.transaction_items || []
  const storeName = storeSettings?.store_name || 'Bandar Frozen Food'
  const address = storeSettings?.address || ''
  const wa = storeSettings?.whatsapp || ''
  const footer = storeSettings?.footer_note || 'Terima kasih sudah berbelanja!'

  const itemRows = items.map(item => `
    <tr class="item-name-row">
      <td colspan="2"><b>${item.product_name}</b></td>
    </tr>
    <tr class="item-detail-row">
      <td>${item.quantity} x ${formatRupiah(item.price)}</td>
      <td class="right"><b>${formatRupiah(item.subtotal)}</b></td>
    </tr>`).join('<tr class="spacer"><td colspan="2"></td></tr>')

  const kembaliRow = transaction.payment_method === 'cash' ? `
    <tr>
      <td>Kembali</td>
      <td class="right">${formatRupiah(transaction.change)}</td>
    </tr>` : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Struk</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    width: 44mm;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.5;
    color: #000;
  }
  body { padding: 2mm 0 10mm 4mm; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 0; }
  .right { text-align: right; }
  .center { text-align: center; }
  .store-name { font-size: 13px; font-weight: bold; text-align: center; }
  .sub { font-size: 10px; text-align: center; }
  .sep-eq   { font-size: 10px; letter-spacing: -1px; text-align: center; overflow: hidden; }
  .sep-dash { font-size: 10px; letter-spacing: -1px; text-align: center; overflow: hidden; }
  .label { white-space: nowrap; padding-right: 3px; }
  .item-name-row td { font-size: 11px; font-weight: bold; padding-top: 2px; }
  .item-detail-row td { font-size: 10px; padding-bottom: 2px; }
  .spacer td { height: 2px; }
  .total-label { font-size: 13px; font-weight: bold; }
  .total-value { font-size: 13px; font-weight: bold; text-align: right; }
  .pay-label { font-size: 11px; font-weight: bold; }
  .pay-value { font-size: 11px; font-weight: bold; text-align: right; }
  .footer { font-size: 10px; text-align: center; margin-top: 4px; }
  @media print {
    @page { size: 58mm auto; margin: 0; }
    html, body { width: 44mm; padding: 1mm 0 8mm 4mm; }
  }
</style>
</head>
<body>
  <div class="store-name">${storeName}</div>
  ${address ? `<div class="sub">${address}</div>` : ''}
  ${wa ? `<div class="sub">WA: ${wa}</div>` : ''}
  <div class="sep-eq">================================</div>

  <table>
    <tr><td class="label">No</td><td class="right">${transaction.invoice_no}</td></tr>
    <tr><td class="label">Kasir</td><td class="right">${transaction.profiles?.full_name || '-'}</td></tr>
    <tr><td class="label">Tgl</td><td class="right">${formatDate(transaction.created_at)}</td></tr>
  </table>
  <div class="sep-dash">--------------------------------</div>

  <table>
    ${itemRows}
  </table>
  <div class="sep-dash">--------------------------------</div>

  <table>
    <tr>
      <td class="total-label">TOTAL</td>
      <td class="total-value">${formatRupiah(transaction.total)}</td>
    </tr>
  </table>
  <div class="sep-dash">--------------------------------</div>

  <table>
    <tr>
      <td class="pay-label">${transaction.payment_method === 'cash' ? 'Cash' : 'QRIS'}</td>
      <td class="pay-value">${formatRupiah(transaction.paid)}</td>
    </tr>
    ${kembaliRow}
  </table>
  <div class="sep-eq">================================</div>
  <div class="footer">${footer}</div>
</body>
</html>`
}

export default function StrukPrint({ transaction, storeSettings, onClose }: Props) {
  const items = transaction.transaction_items || []
  const storeName = storeSettings?.store_name || 'Bandar Frozen Food'

  function handlePrint() {
    const html = buildStrukHtml(transaction, storeSettings)
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:44mm;border:none;'
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

        {/* Preview — simulasi lebar 48mm */}
        <div className="p-3 overflow-y-auto max-h-[60vh] bg-white flex justify-center">
          <div style={{ width: '44mm', fontFamily: "'Courier New', monospace", fontSize: 11, lineHeight: 1.5 }}
            className="text-black">
            <div className="text-center font-bold" style={{fontSize:13}}>{storeName}</div>
            {storeSettings?.address && <div className="text-center" style={{fontSize:10}}>{storeSettings.address}</div>}
            {storeSettings?.whatsapp && <div className="text-center" style={{fontSize:10}}>WA: {storeSettings.whatsapp}</div>}
            <div className="text-center overflow-hidden" style={{fontSize:10,letterSpacing:-1}}>================================</div>
            <table className="w-full" style={{fontSize:11}}>
              <tbody>
                <tr><td className="pr-1 whitespace-nowrap">No</td><td className="text-right">{transaction.invoice_no}</td></tr>
                <tr><td className="pr-1 whitespace-nowrap">Kasir</td><td className="text-right">{transaction.profiles?.full_name || '-'}</td></tr>
                <tr><td className="pr-1 whitespace-nowrap">Tgl</td><td className="text-right">{formatDate(transaction.created_at)}</td></tr>
              </tbody>
            </table>
            <div className="text-center overflow-hidden" style={{fontSize:10,letterSpacing:-1}}>--------------------------------</div>
            <div className="space-y-1">
              {items.map((item, i) => (
                <div key={i}>
                  <div className="font-bold" style={{fontSize:11}}>{item.product_name}</div>
                  <div className="flex justify-between" style={{fontSize:10}}>
                    <span>{item.quantity} x {formatRupiah(item.price)}</span>
                    <span className="font-bold">{formatRupiah(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center overflow-hidden" style={{fontSize:10,letterSpacing:-1}}>--------------------------------</div>
            <div className="flex justify-between font-bold" style={{fontSize:13}}>
              <span>TOTAL</span><span>{formatRupiah(transaction.total)}</span>
            </div>
            <div className="text-center overflow-hidden" style={{fontSize:10,letterSpacing:-1}}>--------------------------------</div>
            <div className="flex justify-between font-bold" style={{fontSize:11}}>
              <span>{transaction.payment_method === 'cash' ? 'Cash' : 'QRIS'}</span>
              <span>{formatRupiah(transaction.paid)}</span>
            </div>
            {transaction.payment_method === 'cash' && (
              <div className="flex justify-between font-bold" style={{fontSize:11}}>
                <span>Kembali</span><span>{formatRupiah(transaction.change)}</span>
              </div>
            )}
            <div className="text-center overflow-hidden" style={{fontSize:10,letterSpacing:-1}}>================================</div>
            <div className="text-center mt-1" style={{fontSize:10}}>{storeSettings?.footer_note || 'Terima kasih sudah berbelanja!'}</div>
          </div>
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
