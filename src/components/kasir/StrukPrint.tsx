'use client'

import { useRef } from 'react'
import { X, Printer, Share2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { Transaction, StoreSettings } from '@/types'

interface Props {
  transaction: Transaction
  storeSettings: StoreSettings | null
  onClose: () => void
}

const LOGO_URL = '/logo_hitam.png'

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
    font-family: 'Courier New', 'Lucida Console', 'DejaVu Sans Mono', monospace;
    font-size: 11px;
    font-weight: bold;
    line-height: 1.5;
    color: #000;
  }
  body { padding: 2mm 0 10mm 4mm; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 0; font-weight: bold; }
  .right { text-align: right; }
  .center { text-align: center; }
  .header-row { display: flex; align-items: center; gap: 2mm; margin-bottom: 2px; }
  .header-logo img {
    width: 18mm; height: 24mm;
    object-fit: contain;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    display: block;
  }
  .header-text { flex: 1; }
  .store-name { font-size: 14px; font-weight: bold; line-height: 1.3; }
  .sub { font-size: 10px; font-weight: bold; text-align: center; }
  .sep-eq   { font-size: 10px; letter-spacing: -1px; text-align: center; overflow: hidden; }
  .sep-dash { font-size: 10px; letter-spacing: -1px; text-align: center; overflow: hidden; }
  .label { white-space: nowrap; padding-right: 3px; }
  .item-name-row td { font-size: 11px; font-weight: bold; padding-top: 2px; }
  .item-detail-row td { font-size: 10px; font-weight: bold; padding-bottom: 2px; }
  .spacer td { height: 2px; }
  .total-label { font-size: 13px; font-weight: bold; }
  .total-value { font-size: 13px; font-weight: bold; text-align: right; }
  .pay-label { font-size: 11px; font-weight: bold; }
  .pay-value { font-size: 11px; font-weight: bold; text-align: right; }
  .footer { font-size: 10px; font-weight: bold; text-align: center; margin-top: 4px; }
  @media print {
    @page { size: 58mm auto; margin: 0; }
    html, body { width: 44mm; padding: 1mm 0 8mm 4mm; }
  }
</style>
</head>
<body>
  <div class="header-row">
    <div class="header-logo"><img src="${LOGO_URL}" alt="logo"/></div>
    <div class="header-text">
      <div class="store-name">${storeName.split(' ').join('<br>')}</div>
    </div>
  </div>
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

// Format rupiah ASCII-only untuk printer thermal (tanpa simbol Rp unicode)
function rp(amount: number): string {
  return 'Rp' + amount.toLocaleString('id-ID').replace(/\./g, '.')
}

function pad(left: string, right: string, width = 32): string {
  const gap = width - left.length - right.length
  return left + (gap > 0 ? ' '.repeat(gap) : '\n' + ' '.repeat(width - right.length)) + right
}

function center(text: string, width = 32): string {
  const spaces = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(spaces) + text
}

function formatTgl(dateStr: string): string {
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(2)
  const hh = String(d.getHours()).padStart(2, '0')
  const mn = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yy} ${hh}:${mn}`
}

function wrapCenter(text: string, W: number): string[] {
  const words = text.split(' ')
  const out: string[] = []
  let line = ''
  words.forEach(w => {
    const candidate = line ? line + ' ' + w : w
    if (candidate.length <= W) { line = candidate }
    else { if (line) out.push(center(line, W)); line = w }
  })
  if (line) out.push(center(line, W))
  return out
}

function buildStrukText(transaction: Transaction, storeSettings: StoreSettings | null): string {
  const items = transaction.transaction_items || []
  const storeName = storeSettings?.store_name || 'Bandar Frozen Food'
  const address = storeSettings?.address || ''
  const wa = storeSettings?.whatsapp || ''
  const footer = storeSettings?.footer_note || 'Terima kasih sudah berbelanja!'
  const W = 32
  const SEP = '='.repeat(W)
  const DASH = '-'.repeat(W)

  const lines: string[] = []

  // Header
  wrapCenter(storeName, W).forEach(l => lines.push(l))
  if (address) wrapCenter(address, W).forEach(l => lines.push(l))
  if (wa) lines.push(center('WA: ' + wa, W))
  lines.push(SEP)

  // Info — format "Label: nilai" agar tidak overflow
  lines.push('No   : ' + transaction.invoice_no)
  lines.push('Kasir: ' + (transaction.profiles?.full_name || '-'))
  lines.push('Tgl  : ' + formatTgl(transaction.created_at))
  lines.push(DASH)

  // Items — gunakan rp() ASCII-only
  items.forEach(item => {
    lines.push(item.product_name.slice(0, W))
    lines.push(pad(item.quantity + ' x ' + rp(item.price), rp(item.subtotal), W))
  })

  lines.push(DASH)
  lines.push(pad('TOTAL', rp(transaction.total), W))
  lines.push(DASH)
  lines.push(pad(transaction.payment_method === 'cash' ? 'Cash' : 'QRIS', rp(transaction.paid), W))
  if (transaction.payment_method === 'cash') {
    lines.push(pad('Kembali', rp(transaction.change), W))
  }
  lines.push(SEP)
  wrapCenter(footer, W).forEach(l => lines.push(l))
  lines.push('')  // 1 baris kosong untuk cut

  return lines.join('\n')
}

export default function StrukPrint({ transaction, storeSettings, onClose }: Props) {
  const items = transaction.transaction_items || []
  const storeName = storeSettings?.store_name || 'Bandar Frozen Food'
  const previewRef = useRef<HTMLDivElement>(null)

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

  async function handleShare() {
    if (!previewRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const filename = `struk-${transaction.invoice_no}.png`

      // Coba Web Share API (HP Android/iOS)
      if (navigator.canShare) {
        canvas.toBlob(async (blob) => {
          if (!blob) { toast.error('Gagal membuat gambar'); return }
          const file = new File([blob], filename, { type: 'image/png' })
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], title: `Struk ${transaction.invoice_no}` })
            } catch {
              // User cancel share — tidak perlu error
            }
            return
          }
          // Fallback: download
          downloadCanvas(canvas, filename)
        }, 'image/png')
      } else {
        // Desktop: langsung download
        downloadCanvas(canvas, filename)
      }
    } catch {
      toast.error('Gagal membuat screenshot')
    }
  }

  function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = filename
    a.click()
    toast.success('Gambar struk tersimpan')
  }

  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full shadow-2xl max-w-md flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="font-bold text-gray-900">Struk Pembayaran</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Preview — besar & lebar penuh, scroll vertikal saat item banyak */}
        <div className="bg-white w-full block px-4 pt-2 overflow-y-auto flex-1 min-h-0">
          <div
            ref={previewRef}
            className="text-black block w-full box-border font-bold bg-white text-[22px] leading-[1.5] px-0 pt-2 pb-6"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            <div className="flex items-center gap-2 mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="logo" className="object-contain shrink-0 w-[130px] h-[174px]" />
              <div className="font-bold leading-[1.3] text-[30px]">
                {storeName.split(' ').map((w, i) => <div key={i}>{w}</div>)}
              </div>
            </div>
            {storeSettings?.address && <div className="text-center text-[20px]">{storeSettings.address}</div>}
            {storeSettings?.whatsapp && <div className="text-center text-[20px]">WA: {storeSettings.whatsapp}</div>}
            <div className="border-t-[3px] border-black my-1.5" />
            <table className="w-full text-[22px]">
              <tbody>
                <tr><td className="pr-1 whitespace-nowrap">No</td><td className="text-right">{transaction.invoice_no}</td></tr>
                <tr><td className="pr-1 whitespace-nowrap">Kasir</td><td className="text-right">{transaction.profiles?.full_name || '-'}</td></tr>
                <tr><td className="pr-1 whitespace-nowrap">Tgl</td><td className="text-right">{formatDate(transaction.created_at)}</td></tr>
              </tbody>
            </table>
            <div className="border-t-2 border-dashed border-black my-1.5" />
            <div className="space-y-1">
              {items.map((item, i) => (
                <div key={i}>
                  <div className="font-bold text-[22px]">{item.product_name}</div>
                  <div className="flex justify-between text-[20px]">
                    <span>{item.quantity} x {formatRupiah(item.price)}</span>
                    <span className="font-bold">{formatRupiah(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-dashed border-black my-1.5" />
            <div className="flex justify-between font-bold text-[26px]">
              <span>TOTAL</span><span>{formatRupiah(transaction.total)}</span>
            </div>
            <div className="border-t-2 border-dashed border-black my-1.5" />
            <div className="flex justify-between font-bold text-[22px]">
              <span>{transaction.payment_method === 'cash' ? 'Cash' : 'QRIS'}</span>
              <span>{formatRupiah(transaction.paid)}</span>
            </div>
            {transaction.payment_method === 'cash' && (
              <div className="flex justify-between font-bold text-[22px]">
                <span>Kembali</span><span>{formatRupiah(transaction.change)}</span>
              </div>
            )}
            <div className="border-t-[3px] border-black my-1.5" />
            <div className="text-center mt-1 text-[20px]">{storeSettings?.footer_note || 'Terima kasih sudah berbelanja!'}</div>
          </div>
        </div>

        <div className="p-4 border-t shrink-0">
          <div className="flex gap-2">
            <button onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 text-sm">
              {canShare ? <Share2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {canShare ? 'Kirim / WA' : 'Simpan'}
            </button>
            <button onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 text-sm">
              <Printer className="w-4 h-4" /> Print 58mm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
