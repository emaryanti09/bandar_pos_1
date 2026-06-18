'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, Minus, Trash2, CreditCard, PackageOpen, Printer, X, Camera, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import type { CartItem, Product, Transaction, StoreSettings } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { useProfile } from '@/hooks/useProfile'
import ModalTambahProduk from './ModalTambahProduk'
import ModalBayar from './ModalBayar'
import StrukPrint from './StrukPrint'
import ModalBukaBungkus from './ModalBukaBungkus'
import BarcodeScannerModal from '@/components/shared/BarcodeScannerModal'

export default function KasirClient({ storeSettings }: { storeSettings: StoreSettings | null }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [barcodeBuffer, setBarcodeBuffer] = useState('')
  const [showTambah, setShowTambah] = useState(false)
  const [showBayar, setShowBayar] = useState(false)
  const [showStruk, setShowStruk] = useState(false)
  const [showBukaBungkus, setShowBukaBungkus] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null)
  const [newBarcodeForAdd, setNewBarcodeForAdd] = useState('')
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAddedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const { profile } = useProfile()
  const isAdmin = profile?.role === 'admin'

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0)
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)

  // Search produk saat teks berubah
  const fetchSearchResults = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); setShowSearchResults(false); return }
    const res = await fetch(`/api/produk?search=${encodeURIComponent(q)}&limit=10`)
    const { data } = await res.json()
    setSearchResults(data || [])
    setShowSearchResults(true)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchSearchResults(search), 250)
    return () => clearTimeout(t)
  }, [search, fetchSearchResults])

  // Keyboard barcode buffer (scanner fisik)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 3) {
          handleBarcodeSearch(barcodeBuffer)
          setBarcodeBuffer('')
        }
        return
      }
      if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key)
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current)
        barcodeTimer.current = setTimeout(() => setBarcodeBuffer(''), 500)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [barcodeBuffer])

  async function handleBarcodeSearch(code: string) {
    const res = await fetch(`/api/produk/barcode?code=${encodeURIComponent(code)}`)
    const { data } = await res.json()
    if (data) {
      addToCart(data)
    } else {
      if (isAdmin) {
        setNewBarcodeForAdd(code)
        setShowTambah(true)
        toast(`Barcode ${code} tidak ditemukan. Tambah produk baru?`, { icon: '🔍' })
      } else {
        toast.error(`Barcode ${code} tidak ditemukan`)
      }
    }
  }

  async function handleCameraScan(code: string) {
    setShowScanner(false)
    await handleBarcodeSearch(code)
  }

  function addToCart(product: Product) {
    if (product.stock <= 0) {
      toast.error(`Stok ${product.name} habis`)
      return
    }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.product.price }
          : i
        )
      }
      return [{ product, quantity: 1, subtotal: product.price }, ...prev]
    })
    // Flash indicator
    if (lastAddedTimer.current) clearTimeout(lastAddedTimer.current)
    setLastAdded(product.id)
    lastAddedTimer.current = setTimeout(() => setLastAdded(null), 1200)

    toast.success(`${product.name} +1`, { duration: 800 })
    setSearch('')
    setShowSearchResults(false)
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev => prev
      .map(i => i.product.id === productId
        ? { ...i, quantity: i.quantity + delta, subtotal: (i.quantity + delta) * i.product.price }
        : i
      )
      .filter(i => i.quantity > 0)
    )
  }

  function setQtyDirect(productId: string, qty: number) {
    if (qty < 1) {
      setCart(prev => prev.filter(i => i.product.id !== productId))
      return
    }
    setCart(prev => prev.map(i => i.product.id === productId
      ? { ...i, quantity: qty, subtotal: qty * i.product.price }
      : i
    ))
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  function clearCart() {
    setCart([])
    setLastTransaction(null)
  }

  function handleTransactionSuccess(transaction: Transaction) {
    setLastTransaction(transaction)
    setCart([])
    setShowBayar(false)
    setShowStruk(true)
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] bg-gray-50">

      {/* ── SEARCH / SCAN BAR ─────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 bg-white border-b border-gray-100 shadow-sm relative z-10">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => search && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 150)}
              placeholder="Cari nama / barcode produk..."
              className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            />
            {search && (
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => { setSearch(''); setShowSearchResults(false) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Scan kamera */}
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center justify-center w-11 h-11 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all shrink-0 shadow-sm shadow-blue-200"
            title="Scan barcode kamera"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Buka bungkus */}
          <button
            onClick={() => setShowBukaBungkus(true)}
            className="flex items-center justify-center w-11 h-11 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl hover:bg-amber-100 active:scale-95 transition-all shrink-0"
            title="Buka Bungkus"
          >
            <PackageOpen className="w-5 h-5" />
          </button>
        </div>

        {/* Search dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto z-50">
            {searchResults.map(p => {
              const habis = p.stock <= 0
              return (
                <button
                  key={p.id}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => addToCart(p)}
                  disabled={habis}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 active:bg-blue-100 border-b last:border-0 text-left disabled:opacity-50 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getBgColor(p.name)}`}>
                    <span className="text-xs font-black text-white">{getInitials(p.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatRupiah(p.price)} · Stok: {habis ? <span className="text-red-500">Habis</span> : p.stock}
                    </p>
                  </div>
                  <ScanLine className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── CART LIST ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3 pb-20">
            <ShoppingCartIcon className="w-16 h-16" />
            <div className="text-center">
              <p className="font-medium text-gray-400">Keranjang kosong</p>
              <p className="text-sm mt-1">Scan barcode atau cari produk di atas</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-400 font-medium">{cart.length} jenis · {totalItems} item</p>
              <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Kosongkan
              </button>
            </div>

            {cart.map(item => (
              <div
                key={item.product.id}
                className={`bg-white rounded-2xl border shadow-sm px-4 py-3 transition-all ${
                  lastAdded === item.product.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100'
                }`}
              >
                {/* Top row: name + delete */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getBgColor(item.product.name)}`}>
                      <span className="text-xs font-black text-white">{getInitials(item.product.name)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-gray-400">{formatRupiah(item.product.price)} / {item.product.unit_small || item.product.unit}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-gray-200 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom row: qty controls + subtotal */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.product.id, -1)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      min={1}
                      onChange={e => setQtyDirect(item.product.id, parseInt(e.target.value) || 0)}
                      className="w-12 h-8 text-center font-bold text-gray-900 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    />
                    <button
                      onClick={() => updateQty(item.product.id, 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-green-100 hover:text-green-600 flex items-center justify-center transition-colors active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-bold text-blue-700 text-base">{formatRupiah(item.subtotal)}</p>
                </div>
              </div>
            ))}

            {/* Spacer so last item isn't hidden behind bottom bar */}
            <div className="h-4" />
          </>
        )}
      </div>

      {/* ── BOTTOM BAR ────────────────────────────────────── */}
      <div className="bg-white border-t border-gray-100 px-3 pt-2 pb-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        {/* Summary */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{totalItems} item</span>
            {lastTransaction && (
              <button
                onClick={() => setShowStruk(true)}
                className="flex items-center gap-1 text-gray-400 hover:text-gray-600"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="text-xs">Struk</span>
              </button>
            )}
          </div>
          <span className="font-bold text-xl text-blue-700">{formatRupiah(subtotal)}</span>
        </div>

        {/* Bayar button */}
        <button
          onClick={() => cart.length > 0 && setShowBayar(true)}
          disabled={cart.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-base hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
        >
          <CreditCard className="w-5 h-5" />
          {cart.length === 0 ? 'Bayar' : `Bayar ${formatRupiah(subtotal)}`}
        </button>
      </div>

      {/* ── MODALS ────────────────────────────────────────── */}
      {showScanner && (
        <BarcodeScannerModal
          onDetected={handleCameraScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showTambah && isAdmin && (
        <ModalTambahProduk
          initialBarcode={newBarcodeForAdd}
          onClose={() => setShowTambah(false)}
          onSaved={product => { addToCart(product); setShowTambah(false) }}
        />
      )}

      {showBayar && (
        <ModalBayar
          cart={cart}
          subtotal={subtotal}
          onClose={() => setShowBayar(false)}
          onSuccess={handleTransactionSuccess}
        />
      )}

      {showStruk && lastTransaction && (
        <StrukPrint
          transaction={lastTransaction}
          storeSettings={storeSettings}
          onClose={() => setShowStruk(false)}
        />
      )}

      {showBukaBungkus && (
        <ModalBukaBungkus
          onClose={() => setShowBukaBungkus(false)}
          onDone={() => setShowBukaBungkus(false)}
        />
      )}
    </div>
  )
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

const BG_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-teal-500',
  'bg-indigo-500', 'bg-amber-500',
]

function getBgColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length]
}

function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}
