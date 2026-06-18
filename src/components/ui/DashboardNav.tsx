'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShoppingCart, Package, BarChart3, Settings, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'
import { cn } from '@/lib/utils'

const kasirNav = [
  { href: '/kasir', label: 'Kasir', icon: ShoppingCart },
]

const adminNav = [
  { href: '/kasir', label: 'Kasir', icon: ShoppingCart },
  { href: '/produk', label: 'Produk', icon: Package },
  { href: '/laporan', label: 'Laporan', icon: BarChart3 },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
]

export default function DashboardNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const navItems = profile.role === 'admin' ? adminNav : kasirNav

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-blue-700 text-white shadow-md">
      <div className="max-w-screen-xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6" />
          <span className="font-bold text-lg">Bandar POS</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith(href) && (href !== '/kasir' || pathname === '/kasir')
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="font-medium">{profile.full_name}</p>
            <p className="text-blue-200 text-xs capitalize">{profile.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-100 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-blue-600 bg-blue-700 px-4 pb-4">
          <div className="pt-3 pb-2 text-sm">
            <p className="font-medium">{profile.full_name}</p>
            <p className="text-blue-200 text-xs capitalize">{profile.role}</p>
          </div>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1',
                pathname === href ? 'bg-white/20' : 'text-blue-100 hover:bg-white/10'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-blue-100 hover:bg-white/10 w-full mt-2"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      )}
    </header>
  )
}
