import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function isExpiringSoon(expiredAt: string | null, daysThreshold = 30): boolean {
  if (!expiredAt) return false
  const exp = new Date(expiredAt)
  const now = new Date()
  const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diff <= daysThreshold && diff >= 0
}

export function isExpired(expiredAt: string | null): boolean {
  if (!expiredAt) return false
  return new Date(expiredAt) < new Date()
}
