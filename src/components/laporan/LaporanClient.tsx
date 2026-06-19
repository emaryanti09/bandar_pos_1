'use client'

import { useState, useEffect, useCallback } from 'react'
import { Printer, Download, TrendingUp, ShoppingBag, Banknote, QrCode } from 'lucide-react'
import { formatRupiah, formatDate, formatDateShort, isExpired, isExpiringSoon } from '@/lib/utils'
import type { Transaction, Product, StoreSettings } from '@/types'
import * as XLSX from 'xlsx'

type Tab = 'transaksi' | 'stok' | 'hampir_habis' | 'kadaluarsa'

interface Summary {
  totalRevenue: number
  totalTransactions: number
  cashCount: number
  qrisCount: number
}

export default function LaporanClient({ storeSettings }: { storeSettings: StoreSettings | null }) {
  const [tab, setTab] = useState<Tab>('transaksi')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const loadData = useCallback(async () => {
    setLoading(true)
    if (tab === 'transaksi') {
      const res = await fetch(`/api/laporan?type=transaksi&date_from=${dateFrom}T00:00:00&date_to=${dateTo}`)
      const data = await res.json()
      setTransactions(data.data || [])
      setSummary(data.summary || null)
    } else {
      const res = await fetch(`/api/laporan?type=${tab}`)
      const data = await res.json()
      setProducts(data.data || [])
      setSummary(null)
    }
    setLoading(false)
  }, [tab, dateFrom, dateTo])

  useEffect(() => { loadData() }, [loadData])

  function handlePrint() {
    window.print()
  }

  function exportExcel() {
    let data: object[] = []
    let filename = ''

    if (tab === 'transaksi') {
      data = transactions.map(t => ({
        'No Invoice': t.invoice_no,
        'Tanggal': formatDate(t.created_at),
        'Kasir': t.profiles?.full_name || '-',
        'Metode': t.payment_method.toUpperCase(),
        'Total': t.total,
      }))
      filename = `laporan-transaksi-${dateFrom}-${dateTo}.xlsx`
    } else {
      data = products.map(p => ({
        'Barcode': p.barcode || '-',
        'Nama': p.name,
        'Unit': p.unit,
        'Harga': p.price,
        'Stok': p.stock,
        'Min Stok': p.stock_min,
        'Kadaluarsa': p.expired_at || '-',
      }))
      filename = `laporan-${tab}.xlsx`
    }

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan')
    XLSX.writeFile(wb, filename)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'transaksi', label: 'Transaksi' },
    { key: 'stok', label: 'Stok Barang' },
    { key: 'hampir_habis', label: 'Hampir Habis' },
    { key: 'kadaluarsa', label: 'Kadaluarsa' },
  ]

  return (
    <>
      <style>{`
        @media print {
          @page { size: 58mm auto; margin: 2mm; }
          .no-print { display: none !important; }
          body { font-size: 9px; font-family: monospace; }
          .print-title { text-align: center; font-weight: bold; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 8px; }
          th, td { padding: 1px 2px; text-align: left; }
          th { border-bottom: 1px solid #000; }
        }
      `}</style>

      <div className="max-w-screen-xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Laporan</h1>
            <p className="text-sm text-gray-500">{storeSettings?.store_name}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export Excel
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 no-print">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-red-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Date filter for transaksi */}
        {tab === 'transaksi' && (
          <div className="flex flex-wrap gap-3 no-print">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Dari:</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sampai:</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>
        )}

        {/* Summary cards for transaksi */}
        {tab === 'transaksi' && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
            {[
              { label: 'Total Pendapatan', value: formatRupiah(summary.totalRevenue), icon: TrendingUp, color: 'blue' },
              { label: 'Jumlah Transaksi', value: String(summary.totalTransactions), icon: ShoppingBag, color: 'green' },
              { label: 'Transaksi Cash', value: String(summary.cashCount), icon: Banknote, color: 'amber' },
              { label: 'Transaksi QRIS', value: String(summary.qrisCount), icon: QrCode, color: 'purple' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Print header */}
        <div className="hidden print:block print-title">
          <p className="text-sm font-bold">{storeSettings?.store_name}</p>
          <p>Laporan {tabs.find(t => t.key === tab)?.label}</p>
          {tab === 'transaksi' && <p>{dateFrom} s/d {dateTo}</p>}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-400">Memuat data...</div>
          ) : tab === 'transaksi' ? (
            <TransaksiTable transactions={transactions} />
          ) : (
            <ProdukTable products={products} tab={tab} />
          )}
        </div>
      </div>
    </>
  )
}

function TransaksiTable({ transactions }: { transactions: Transaction[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!transactions.length) return <div className="text-center py-16 text-gray-400">Tidak ada transaksi</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Kasir</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Metode</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {transactions.map(t => (
            <>
              <tr key={t.id} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{t.invoice_no}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(t.created_at)}</td>
                <td className="px-4 py-3 text-gray-700">{t.profiles?.full_name || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.payment_method === 'cash' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {t.payment_method.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(t.total)}</td>
              </tr>
              {expandedId === t.id && t.transaction_items && (
                <tr key={`${t.id}-detail`}>
                  <td colSpan={5} className="px-4 pb-3 bg-red-50">
                    <div className="pl-4 space-y-1">
                      {t.transaction_items.map(item => (
                        <div key={item.id} className="flex justify-between text-xs text-gray-600">
                          <span>{item.product_name} × {item.quantity}</span>
                          <span>{formatRupiah(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProdukTable({ products, tab }: { products: Product[], tab: Tab }) {
  if (!products.length) return <div className="text-center py-16 text-gray-400">Tidak ada data</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Produk</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Barcode</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Harga</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Stok</th>
            {tab !== 'hampir_habis' && <th className="text-right px-4 py-3 font-medium text-gray-600">Min Stok</th>}
            {(tab === 'stok' || tab === 'kadaluarsa') && <th className="text-left px-4 py-3 font-medium text-gray-600">Kadaluarsa</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {products.map(p => {
            const expired = isExpired(p.expired_at)
            const expiringSoon = isExpiringSoon(p.expired_at)
            return (
              <tr key={p.id} className={`hover:bg-gray-50 ${expired ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.barcode || '-'}</td>
                <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(p.price)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-bold ${p.stock <= p.stock_min ? 'text-red-600' : 'text-gray-900'}`}>{p.stock}</span>
                </td>
                {tab !== 'hampir_habis' && <td className="px-4 py-3 text-right text-gray-500">{p.stock_min}</td>}
                {(tab === 'stok' || tab === 'kadaluarsa') && (
                  <td className="px-4 py-3">
                    {p.expired_at ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${expired ? 'bg-red-100 text-red-700' : expiringSoon ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                        {formatDateShort(p.expired_at)}
                      </span>
                    ) : '-'}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
