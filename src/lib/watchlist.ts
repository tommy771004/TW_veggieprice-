'use client'

import type { WatchlistItem } from './types'

const KEY = 'veggieprice_watchlist:v1'
const KEY_LEGACY = 'veggieprice_watchlist'

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return []
  try {
    const v1Raw = localStorage.getItem(KEY)
    if (v1Raw !== null) {
      return JSON.parse(v1Raw)
    }
    // One-time migration from legacy key (no version suffix)
    const legacyRaw = localStorage.getItem(KEY_LEGACY)
    if (legacyRaw !== null) {
      const items = JSON.parse(legacyRaw) as WatchlistItem[]
      localStorage.setItem(KEY, JSON.stringify(items))
      localStorage.removeItem(KEY_LEGACY)
      return items
    }
    return []
  } catch {
    return []
  }
}

export function addToWatchlist(item: Omit<WatchlistItem, 'addedAt'>): void {
  const list = getWatchlist()
  if (list.some((i) => i.cropCode === item.cropCode)) return
  list.push({ ...item, addedAt: new Date().toISOString() })
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function removeFromWatchlist(cropCode: string): void {
  const list = getWatchlist().filter((i) => i.cropCode !== cropCode)
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function isInWatchlist(cropCode: string): boolean {
  return getWatchlist().some((i) => i.cropCode === cropCode)
}

export function toggleWatchlist(item: Omit<WatchlistItem, 'addedAt'>): boolean {
  if (isInWatchlist(item.cropCode)) {
    removeFromWatchlist(item.cropCode)
    return false
  }
  addToWatchlist(item)
  return true
}
