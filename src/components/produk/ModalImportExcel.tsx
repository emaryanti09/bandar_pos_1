'use client'

import { useState, useRef } from 'react'
import { X, Upload, Download, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

interface Props {
  onClose: () => void
  onSaved: () => void
}

interface ExcelRow {
  barcode?: string
  name: string
  unit?: string
  unit_small?: string
  unit_conversion?: number
  price: number
  stock?: number
  stock_min?: number
  expired_at?: string
}

export default function ModalImportExcel({ onClose, onSaved }: Props) {
  const [rows, setRows] = useState<ExcelRow[]>([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result
      const wb = XLSX.read(data, { type: 'binary', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<ExcelRow>(ws)
      setRows(json)
    }
    reader.readAsBinaryString(file)
  }

  function downloadTemplate() {
    const template = [
      { barcode: '8991234567890', name: 'Indomie Goreng', unit: 'dus', unit_small: 'pcs', unit_conversion: 40, price: 3500, stock: 100, stock_min: 20, expired_at: '2026-12-31' },
      { barcode: '', name: 'Aqua 600ml', unit: 'dus', unit_small: 'botol', unit_conversion: 24, price: 3000, stock: 50, stock_min: 12, expired_at: '' },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Produk')
    XLSX.writeFile(wb, 'template_produk.xlsx')
  }

  async function handleImport() {
    if (!rows.length) { toast.error('Tidak ada data'); return }
    const valid = rows.filter(r => r.name && r.price)
    if (!valid.length) { toast.error('Tidak ada data valid (name & price wajib)'); return }

    setLoading(true)
    const res = await fetch('/api/produk/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: valid }),
    })
    const result = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(result.error || 'Gagal import'); return }
    toast.success(`${result.count} produk berhasil diimport`)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-900">Import Produk dari Excel</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="flex gap-3">
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Download Template
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-600 hover:bg-blue-100">
              <Upload className="w-4 h-4" /> Pilih File Excel
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          </div>

          {rows.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <p className="text-sm font-medium text-gray-700">{rows.length} baris ditemukan</p>
              </div>
              <div className="border border-gray-100 rounded-xl overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {['Barcode', 'Nama', 'Unit', 'Harga', 'Stok', 'Kadaluarsa'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i} className={!r.name || !r.price ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 text-gray-500">{r.barcode || '-'}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                        <td className="px-3 py-2 text-gray-500">{r.unit || 'pcs'}</td>
                        <td className="px-3 py-2 text-gray-900">{r.price?.toLocaleString('id-ID')}</td>
                        <td className="px-3 py-2 text-gray-500">{r.stock || 0}</td>
                        <td className="px-3 py-2 text-gray-500">{r.expired_at || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && <p className="text-center text-xs text-gray-400 py-2">+{rows.length - 20} baris lainnya</p>}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Batal</button>
          <button onClick={handleImport} disabled={loading || rows.length === 0}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40">
            {loading ? 'Mengimport...' : `Import ${rows.length} Produk`}
          </button>
        </div>
      </div>
    </div>
  )
}
