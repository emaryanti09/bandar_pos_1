'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, Printer, X, PackageOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import type { CartItem, Product, Transaction, StoreSettings } from '@/types'
import { formatRupiah } from '@/lib/utils'
import ModalTambahProduk from './ModalTambahProduk'
import ModalBayar from './ModalBayar'
import StrukPrint from './StrukPrint'
import ModalBukaBungkus from './ModalBukaBungkus'

export default function KasirClient({ storeSettings }: { storeSettings: StoreSettings | null }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [barcodeBuffer, setBarcodeBuffer] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [showTambah, setShowTambah] = useState(false)
  const [showBayar, setShowBayar] = useState(false)
  const [showStruk, setShowStruk] = useState(false)
  const [showBukaBungkus, setShowBukaBungkus] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null)
  const [newBarcodeForAdd, setNewBarcodeForAdd] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0)

  // Barcode scanner via keyboard buffer
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
      toast.success(`${data.name} ditambahkan`)
    } else {
      setNewBarcodeForAdd(code)
      setShowTambah(true)
      toast(`Barcode ${code} tidak ditemukan. Tambah produk baru?`, { icon: '🔍' })
    }
  }

  async function handleSearch(q: string) {
    setSearch(q)
    if (!q.trim()) { setSearchResults([]); setShowSearch(false); return }
    const res = await fetch(`/api/produk?search=${encodeURIComponent(q)}&limit=8`)
    const { data } = await res.json()
    setSearchResults(data || [])
    setShowSearch(true)
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.product.price }
          : i
        )
      }
      return [...prev, { product, quantity: 1, subtotal: product.price }]
    })
    setSearch('')
    setSearchResults([])
    setShowSearch(false)
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
    <div className="max-w-screen-xl mx-auto h-[calc(100vh-56px)] flex flex-col md:flex-row gap-4">
      {/* LEFT: Search & Cart */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Cari produk atau scan barcode..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          {search && (
            <button onClick={() => { setSearch(''); setSearchResults([]); setShowSearch(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}

          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20 max-h-72 overflow-y-auto">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.barcode || '-'} · Stok: {p.stock} {p.unit_small || p.unit}</p>
                  </div>
                  <p className="font-semibold text-blue-600 text-sm">{formatRupiah(p.price)}</p>
                </button>
              ))}
              <button
                onClick={() => { setNewBarcodeForAdd(''); setShowTambah(true); setShowSearch(false) }}
                className="w-full flex items-center gap-2 px-4 py-3 text-blue-600 hover:bg-blue-50 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Tambah produk baru
              </button>
            </div>
          )}

          {showSearch && search && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20">
              <div className="px-4 py-3 text-sm text-gray-500">Produk tidak ditemukan</div>
              <button
                onClick={() => { setNewBarcodeForAdd(search); setShowTambah(true); setShowSearch(false) }}
                className="w-full flex items-center gap-2 px-4 py-3 text-blue-600 hover:bg-blue-50 text-sm font-medium border-t"
              >
                <Plus className="w-4 h-4" /> Tambah produk baru
              </button>
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <ShoppingCartIcon className="w-16 h-16 mb-3" />
              <p className="text-lg">Keranjang kosong</p>
              <p className="text-sm">Scan barcode atau cari produk</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.product.name}</p>
                  <p className="text-sm text-gray-500">{formatRupiah(item.product.price)} / {item.product.unit_small || item.product.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.product.id, -1)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.product.id, 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-green-100 hover:text-green-600 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="font-bold text-blue-700 w-24 text-right">{formatRupiah(item.subtotal)}</p>
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors ml-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Summary & Actions */}
      <div className="w-full md:w-80 flex flex-col gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-bold text-gray-700 mb-3">Ringkasan</h2>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Total Item</span>
            <span className="font-medium">{cart.reduce((s, i) => s + i.quantity, 0)} pcs</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-800 font-semibold text-lg">Total</span>
            <span className="font-bold text-2xl text-blue-700">{formatRupiah(subtotal)}</span>
          </div>
        </div>

        <button
          onClick={() => setShowBukaBungkus(true)}
          className="flex items-center justify-center gap-2 py-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl font-medium hover:bg-amber-100 transition-colors"
        >
          <PackageOpen className="w-5 h-5" />
          Buka Bungkus
        </button>

        <button
          onClick={() => cart.length > 0 && setShowBayar(true)}
          disabled={cart.length === 0}
          className="flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
        >
          <CreditCard className="w-5 h-5" />
          Bayar
        </button>

        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="flex items-center justify-center gap-2 py-2 text-red-500 hover:text-red-700 text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Kosongkan keranjang
          </button>
        )}

        {lastTransaction && (
          <button
            onClick={() => setShowStruk(true)}
            className="flex items-center justify-center gap-2 py-2 text-gray-500 hover:text-gray-700 text-sm border border-gray-200 rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" />
            Cetak struk terakhir
          </button>
        )}
      </div>

      {/* Modals */}
      {showTambah && (
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
        <ModalBukaBungkus onClose={() => setShowBukaBungkus(false)} />
      )}
    </div>
  )
}

function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}
