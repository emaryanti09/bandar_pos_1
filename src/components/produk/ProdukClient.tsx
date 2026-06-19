'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Upload, Edit2, Trash2, Package, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Product } from '@/types'
import { formatRupiah, formatDateShort, isExpired, isExpiringSoon } from '@/lib/utils'
import ModalProduk from './ModalProduk'
import ModalImportExcel from './ModalImportExcel'
import ModalStokOpname from './ModalStokOpname'
import ModalPembelian from './ModalPembelian'

type Tab = 'semua' | 'hampir_habis' | 'kadaluarsa'

export default function ProdukClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('semua')
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showOpname, setShowOpname] = useState(false)
  const [showPembelian, setShowPembelian] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [opnameProduct, setOpnameProduct] = useState<Product | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    let url = `/api/produk?limit=500`
    if (search) url += `&search=${encodeURIComponent(search)}`
    if (tab === 'hampir_habis') url += `&low_stock=true`
    if (tab === 'kadaluarsa') url += `&expiring=true`

    const res = await fetch(url)
    const { data, count } = await res.json()
    setProducts(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [search, tab])

  useEffect(() => { loadProducts(); setPage(1) }, [loadProducts])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus produk "${name}"?`)) return
    const res = await fetch(`/api/produk/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Produk dihapus'); loadProducts() }
    else toast.error('Gagal menghapus')
  }

  const totalPages = Math.max(1, Math.ceil(products.length / pageSize))
  const paginated = products.slice((page - 1) * pageSize, page * pageSize)

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'semua', label: 'Semua', icon: <Package className="w-4 h-4" /> },
    { key: 'hampir_habis', label: 'Hampir Habis', icon: <AlertTriangle className="w-4 h-4" /> },
    { key: 'kadaluarsa', label: 'Kadaluarsa', icon: <AlertTriangle className="w-4 h-4 text-orange-500" /> },
  ]

  return (
    <div className="max-w-screen-xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manajemen Produk</h1>
          <p className="text-sm text-gray-500">{total} produk aktif</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowPembelian(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
            <Plus className="w-4 h-4" /> Tambah Stok (Beli)
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors">
            <Upload className="w-4 h-4" /> Import Excel
          </button>
          <button onClick={() => { setEditProduct(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
            <Plus className="w-4 h-4" /> Tambah Produk
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-red-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atau barcode..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Produk</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Barcode</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Harga</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stok</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Min Stok</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kadaluarsa</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Memuat...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Tidak ada produk</td></tr>
              ) : (
                paginated.map(p => {
                  const expired = isExpired(p.expired_at)
                  const expiringSoon = isExpiringSoon(p.expired_at)
                  const lowStock = p.stock <= p.stock_min
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${expired ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.unit_small ? `${p.unit} (${p.unit_conversion} ${p.unit_small})` : p.unit}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-red-700">{p.kode || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.barcode || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatRupiah(p.price)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${lowStock ? 'text-red-600' : 'text-gray-900'}`}>{p.stock}</span>
                        {lowStock && <span className="ml-1 text-xs text-red-500">⚠</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.stock_min}</td>
                      <td className="px-4 py-3">
                        {p.expired_at ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${expired ? 'bg-red-100 text-red-700' : expiringSoon ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                            {expired ? '⛔ ' : expiringSoon ? '⚠ ' : ''}{formatDateShort(p.expired_at)}
                          </span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setOpnameProduct(p); setShowOpname(true) }}
                            title="Stock Opname"
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditProduct(p); setShowModal(true) }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {!loading && products.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 flex-wrap gap-2">
            {/* Info + page size */}
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, products.length)} dari {products.length} produk
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">Baris:</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                >
                  {[5, 10, 25, 50].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Page nav */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >«</button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page number pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | 'ellipsis')[]>((acc, n, idx, arr) => {
                  if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
                  acc.push(n)
                  return acc
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`e${idx}`} className="px-1 text-gray-400 text-xs">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-medium transition-colors ${
                        page === item ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >{item}</button>
                  )
                )}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >»</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <ModalProduk
          product={editProduct}
          onClose={() => { setShowModal(false); setEditProduct(null) }}
          onSaved={() => { setShowModal(false); setEditProduct(null); loadProducts() }}
        />
      )}

      {showOpname && opnameProduct && (
        <ModalStokOpname
          product={opnameProduct}
          onClose={() => { setShowOpname(false); setOpnameProduct(null) }}
          onSaved={() => { setShowOpname(false); setOpnameProduct(null); loadProducts() }}
        />
      )}

      {showImport && (
        <ModalImportExcel
          onClose={() => setShowImport(false)}
          onSaved={() => { setShowImport(false); loadProducts() }}
        />
      )}

      {showPembelian && (
        <ModalPembelian
          onClose={() => setShowPembelian(false)}
          onSaved={() => { setShowPembelian(false); loadProducts() }}
        />
      )}
    </div>
  )
}
