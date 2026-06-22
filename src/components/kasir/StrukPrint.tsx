'use client'

import { useRef, useEffect, useState } from 'react'
import { X, Printer, Eye, Share2, Download, BluetoothConnected } from 'lucide-react'
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

function trimAndScaleCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  let lastContentRow = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx], g = data[idx + 1], b = data[idx + 2]
      if (r < 250 || g < 250 || b < 250) lastContentRow = y
    }
  }
  const croppedHeight = Math.min(lastContentRow + 20, height)
  // Scale ke lebar printer 58mm (576px @ 203dpi), proporsional
  const TARGET_WIDTH = 576
  const scale = TARGET_WIDTH / width
  const out = document.createElement('canvas')
  out.width = TARGET_WIDTH
  out.height = Math.round(croppedHeight * scale)
  const octx = out.getContext('2d')
  if (octx) {
    octx.fillStyle = '#ffffff'
    octx.fillRect(0, 0, out.width, out.height)
    octx.drawImage(canvas, 0, 0, width, croppedHeight, 0, 0, out.width, out.height)
  }
  return out
}

export default function StrukPrint({ transaction, storeSettings, onClose }: Props) {
  const items = transaction.transaction_items || []
  const storeName = storeSettings?.store_name || 'Bandar Frozen Food'
  const previewRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => { setIsMobile(window.innerWidth < 768) }, [])

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

  async function handleRawBT() {
    if (!previewRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        logging: false,
      })
      const trimmed = trimAndScaleCanvas(canvas)
      const filename = `rawbt-${transaction.invoice_no}.png`
      trimmed.toBlob(async (blob) => {
        if (!blob) { toast.error('Gagal membuat gambar'); return }
        const file = new File([blob], filename, { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: `Struk ${transaction.invoice_no}` })
          } catch { /* user cancel */ }
        } else {
          downloadCanvas(trimmed, filename)
        }
      }, 'image/png')
    } catch {
      toast.error('Gagal membuat gambar struk')
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
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-900">Struk Pembayaran</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Preview */}
        <div className={`p-3 bg-white flex justify-center ${isMobile ? '' : 'overflow-y-auto max-h-[55vh]'}`}>
          <div
            ref={previewRef}
            style={{
              width: isMobile ? '249px' : '166px',
              fontFamily: "'Courier New', monospace",
              fontSize: isMobile ? 16 : 11,
              lineHeight: 1.5,
              fontWeight: 'bold',
              backgroundColor: '#fff',
              padding: isMobile ? '12px 9px 24px 12px' : '8px 6px 16px 8px',
            }}
            className="text-black"
          >
            <div className="flex items-center gap-2 mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="logo" style={{ width: isMobile ? 102 : 68, height: isMobile ? 136 : 91, objectFit: 'contain', flexShrink: 0 }} />
              <div className="font-bold" style={{fontSize: isMobile ? 21 : 14, lineHeight:1.3}}>
                {storeName.split(' ').map((w, i) => <div key={i}>{w}</div>)}
              </div>
            </div>
            {storeSettings?.address && <div className="text-center" style={{fontSize: isMobile ? 15 : 10}}>{storeSettings.address}</div>}
            {storeSettings?.whatsapp && <div className="text-center" style={{fontSize: isMobile ? 15 : 10}}>WA: {storeSettings.whatsapp}</div>}
            <div className="text-center overflow-hidden" style={{fontSize: isMobile ? 15 : 10, letterSpacing:-1}}>================================</div>
            <table className="w-full" style={{fontSize: isMobile ? 16 : 11}}>
              <tbody>
                <tr><td className="pr-1 whitespace-nowrap">No</td><td className="text-right">{transaction.invoice_no}</td></tr>
                <tr><td className="pr-1 whitespace-nowrap">Kasir</td><td className="text-right">{transaction.profiles?.full_name || '-'}</td></tr>
                <tr><td className="pr-1 whitespace-nowrap">Tgl</td><td className="text-right">{formatDate(transaction.created_at)}</td></tr>
              </tbody>
            </table>
            <div className="text-center overflow-hidden" style={{fontSize: isMobile ? 15 : 10, letterSpacing:-1}}>--------------------------------</div>
            <div className="space-y-1">
              {items.map((item, i) => (
                <div key={i}>
                  <div className="font-bold" style={{fontSize: isMobile ? 16 : 11}}>{item.product_name}</div>
                  <div className="flex justify-between" style={{fontSize: isMobile ? 15 : 10}}>
                    <span>{item.quantity} x {formatRupiah(item.price)}</span>
                    <span className="font-bold">{formatRupiah(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center overflow-hidden" style={{fontSize: isMobile ? 15 : 10, letterSpacing:-1}}>--------------------------------</div>
            <div className="flex justify-between font-bold" style={{fontSize: isMobile ? 19 : 13}}>
              <span>TOTAL</span><span>{formatRupiah(transaction.total)}</span>
            </div>
            <div className="text-center overflow-hidden" style={{fontSize: isMobile ? 15 : 10, letterSpacing:-1}}>--------------------------------</div>
            <div className="flex justify-between font-bold" style={{fontSize: isMobile ? 16 : 11}}>
              <span>{transaction.payment_method === 'cash' ? 'Cash' : 'QRIS'}</span>
              <span>{formatRupiah(transaction.paid)}</span>
            </div>
            {transaction.payment_method === 'cash' && (
              <div className="flex justify-between font-bold" style={{fontSize: isMobile ? 16 : 11}}>
                <span>Kembali</span><span>{formatRupiah(transaction.change)}</span>
              </div>
            )}
            <div className="text-center overflow-hidden" style={{fontSize: isMobile ? 15 : 10, letterSpacing:-1}}>================================</div>
            <div className="text-center mt-1" style={{fontSize: isMobile ? 15 : 10}}>{storeSettings?.footer_note || 'Terima kasih sudah berbelanja!'}</div>
          </div>
        </div>

        <div className="p-4 border-t space-y-2">
          {/* Baris 1: RawBT / Share WA */}
          <div className="flex gap-2">
            <button onClick={handleRawBT}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 text-sm">
              <BluetoothConnected className="w-4 h-4" /> RawBT
            </button>
            <button onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 text-sm">
              {canShare ? <Share2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {canShare ? 'Kirim / WA' : 'Simpan'}
            </button>
          </div>
          {/* Baris 2: Preview / Print */}
          <div className="flex gap-2">
            <button onClick={handlePreview}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 text-sm">
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 text-sm">
              <Printer className="w-4 h-4" /> Print 58mm
            </button>
          </div>
          <button onClick={onClose}
            className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm">
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
