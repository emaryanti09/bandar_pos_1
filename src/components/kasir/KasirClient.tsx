'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, Minus, Trash2, CreditCard, PackageOpen, Printer, X } from 'lucide-react'
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
  const [products, setProducts] = useState<Product[]>([])
  const [showTambah, setShowTambah] = useState(false)
  const [showBayar, setShowBayar] = useState(false)
  const [showStruk, setShowStruk] = useState(false)
  const [showBukaBungkus, setShowBukaBungkus] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null)
  const [newBarcodeForAdd, setNewBarcodeForAdd] = useState('')
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0)

  // Load produk awal
  useEffect(() => {
    fetchProducts('')
  }, [])

  const fetchProducts = useCallback(async (q: string) => {
    const res = await fetch(`/api/produk?search=${encodeURIComponent(q)}&limit=40`)
    const { data } = await res.json()
    setProducts(data || [])
  }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchProducts(search), 300)
    return () => clearTimeout(t)
  }, [search, fetchProducts])

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
      return [...prev, { product, quantity: 1, subtotal: product.price }]
    })
    toast.success(`${product.name} ditambahkan`, { duration: 1000 })
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

  const cartQty = (productId: string) => cart.find(i => i.product.id === productId)?.quantity ?? 0

  return (
    <div className="h-[calc(100vh-56px)] flex gap-3 overflow-hidden">

      {/* LEFT: Grid Produk */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto">
          {products.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Tidak ada produk</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {products.map(p => {
                const qty = cartQty(p.id)
                const habis = p.stock <= 0
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={habis}
                    className={`relative bg-white rounded-xl border p-3 text-left transition-all hover:shadow-md hover:border-blue-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${qty > 0 ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100'}`}
                  >
                    {qty > 0 && (
                      <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {qty}
                      </span>
                    )}
                    {habis && (
                      <span className="absolute top-2 left-2 bg-red-100 text-red-600 text-xs font-medium px-1.5 py-0.5 rounded-md">Habis</span>
                    )}
                    <div className={`w-full py-3 rounded-lg mb-2 flex items-center justify-center ${getBgColor(p.name)}`}>
                      <span className="text-xl font-black text-white tracking-wide">{getInitials(p.name)}</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2 mb-1">{p.name}</p>
                    <p className="text-xs text-blue-600 font-bold">{formatRupiah(p.price)}</p>
                    <p className="text-xs text-gray-400">Stok: {p.stock} {p.unit_small || p.unit}</p>
                  </button>
                )
              })}

              {/* Tambah produk baru */}
              <button
                onClick={() => { setNewBarcodeForAdd(''); setShowTambah(true) }}
                className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-3 flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[120px]"
              >
                <Plus className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">Tambah Produk</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart + Ringkasan */}
      <div className="w-80 flex flex-col gap-2 min-h-0">

        {/* Cart header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Keranjang</h2>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Kosongkan
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-300">
              <ShoppingCartIcon className="w-10 h-10 mb-2" />
              <p className="text-sm">Keranjang kosong</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{item.product.name}</p>
                  <p className="text-xs text-gray-400">{formatRupiah(item.product.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQty(item.product.id, -1)}
                    className="w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-gray-900 text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.product.id, 1)}
                    className="w-6 h-6 rounded-full bg-gray-100 hover:bg-green-100 hover:text-green-600 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <p className="font-bold text-blue-700 text-sm w-20 text-right">{formatRupiah(item.subtotal)}</p>
                <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Ringkasan & tombol */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Total Item</span>
            <span className="font-medium text-gray-700">{cart.reduce((s, i) => s + i.quantity, 0)} pcs</span>
          </div>
          <div className="flex justify-between items-center border-t pt-2">
            <span className="font-bold text-gray-800">Total</span>
            <span className="font-bold text-xl text-blue-700">{formatRupiah(subtotal)}</span>
          </div>
        </div>

        <button
          onClick={() => setShowBukaBungkus(true)}
          className="flex items-center justify-center gap-2 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors"
        >
          <PackageOpen className="w-4 h-4" />
          Buka Bungkus
        </button>

        <button
          onClick={() => cart.length > 0 && setShowBayar(true)}
          disabled={cart.length === 0}
          className="flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-base hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
        >
          <CreditCard className="w-5 h-5" />
          Bayar {cart.length > 0 && `(${formatRupiah(subtotal)})`}
        </button>

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
