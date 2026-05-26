'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getCropEmoji, debounce } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/', label: '首頁' },
  { href: '/search', label: '搜尋' },
  { href: '/seasonal', label: '當季' },
  { href: '/watchlist', label: '關注' },
  { href: '/settings', label: '設定' },
]

export function TopAppBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [focused, setFocused] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setFocused(false)
      }
      if (!notificationRef.current?.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const updateSuggestions = useCallback(
    debounce(async (q: string) => {
      if (!q.trim()) {
        setSuggestions([])
        return
      }

      try {
        const res = await fetch(`/api/prices?crop=${encodeURIComponent(q.trim())}`)
        const json = await res.json()
        if (!res.ok) {
          setSuggestions([])
          return
        }

        const nextSuggestions = [...new Set((json as Array<{ cropName: string }>).map((item) => item.cropName))].slice(0, 6)
        setSuggestions(nextSuggestions)
      } catch {
        setSuggestions([])
      }
    }, 200),
    []
  )

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    updateSuggestions(q)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    setFocused(false)
  }

  function handleSelect(name: string) {
    router.push(`/produce/${encodeURIComponent(name)}`)
    setQuery('')
    setSuggestions([])
    setFocused(false)
  }

  const showSuggestions = focused && suggestions.length > 0

  return (
    <header className="glass-header sticky top-0 z-50 flex items-center gap-3 px-4 md:px-6 py-3">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 flex-shrink-0">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '1.5rem' }}>eco</span>
        <span className="hidden sm:block text-lg font-black text-primary-container tracking-tighter whitespace-nowrap">
          農時價 VeggiePrice
        </span>
      </Link>

      {/* Desktop Nav (Centered) */}
      <div className="hidden md:flex flex-1 justify-center items-center px-2 md:px-8">
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-full text-label-bold font-medium transition-colors whitespace-nowrap ${
                pathname === link.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Right Actions: Search + Notifications */}
      <div className="flex flex-1 md:flex-none items-center justify-end gap-1 md:gap-3">
        {/* Global Search Box */}
        <div ref={containerRef} className="relative w-full md:w-[200px] lg:w-[280px]">
          <form onSubmit={handleSubmit} suppressHydrationWarning>
            <div className="relative">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none"
                style={{ fontSize: '1.25rem' }}
                aria-hidden="true"
              >
                search
              </span>
              <input
                ref={inputRef}
                suppressHydrationWarning
                type="text"
                value={query}
                onChange={handleChange}
                onFocus={() => setFocused(true)}
                placeholder="搜尋作物…"
                aria-label="搜尋作物"
                autoComplete="off"
                className="w-full bg-white/70 border border-white/40 rounded-full py-2 pl-10 pr-4 text-body-md text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white/90 transition-[background-color,box-shadow] backdrop-blur-sm"
              />
            </div>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && (
            <div className="absolute top-full mt-2 w-full glass-card-solid rounded-2xl overflow-hidden shadow-glass z-20">
              {suggestions.map((name) => (
                <button
                  key={name}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(name) }}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 text-body-md text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="text-xl">{getCropEmoji(name)}</span>
                  <span>{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="最新通知"
            className="touch-target flex-shrink-0 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-primary"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>notifications</span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-72 glass-card-solid rounded-2xl overflow-hidden shadow-glass z-50">
              <div className="p-4 border-b border-white/20">
                <h3 className="text-label-bold font-semibold text-primary">最新通知</h3>
              </div>
              <div className="p-4 text-center text-body-md text-on-surface-variant">
                目前沒有新通知
              </div>
              <div className="p-3 border-t border-white/20 bg-white/30 text-center">
                <Link
                  href="/settings#notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-primary hover:underline text-body-sm font-medium"
                >
                  前往通知設定
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}