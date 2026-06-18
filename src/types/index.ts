export type UserRole = 'admin' | 'kasir'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  active: boolean
  created_at: string
}

export interface Product {
  id: string
  barcode: string | null
  name: string
  unit: string
  unit_small: string | null
  unit_conversion: number
  price: number
  stock: number
  stock_min: number
  expired_at: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  invoice_no: string
  cashier_id: string
  payment_method: 'cash' | 'qris'
  subtotal: number
  discount: number
  total: number
  paid: number
  change: number
  note: string | null
  created_at: string
  profiles?: Profile
  transaction_items?: TransactionItem[]
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string | null
  product_name: string
  product_barcode: string | null
  unit: string
  price: number
  quantity: number
  subtotal: number
}

export interface StockMovement {
  id: string
  product_id: string
  type: 'sale' | 'opname' | 'adjustment' | 'open_pack'
  qty_before: number
  qty_change: number
  qty_after: number
  note: string | null
  expired_at: string | null
  reference_id: string | null
  user_id: string | null
  created_at: string
  products?: Product
}

export interface StoreSettings {
  id: string
  store_name: string
  whatsapp: string | null
  address: string | null
  footer_note: string | null
}

export interface CartItem {
  product: Product
  quantity: number
  subtotal: number
}
