'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { debounce } from '@/lib/utils'
import { CropIcon } from '@/components/ui/CropIcon'
import { FeedbackButton } from '@/components/feedback/FeedbackButton'
import { trackEvent } from '@/lib/analytics'

const NAV_LINKS = [
  { href: '/', label: '首頁', icon: 'dashboard' },
  { href: '/search', label: '搜尋', icon: 'search' },
  { href: '/seasonal', label: '當季', icon: 'local_florist' },
  { href: '/watchlist', label: '關注', icon: 'monitoring' },
  { href: '/insights', label: '洞察', icon: 'insights' },
  { href: '/settings', label: '設定', icon: 'settings' },
]

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  if (href === '/search') return pathname === '/search' || pathname.startsWith('/produce/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getRouteMeta(pathname: string | null) {
  if (!pathname) return { kicker: 'Market pulse', label: '首頁總覽' }
  if (pathname.startsWith('/produce/')) {
    return { kicker: 'Produce detail', label: '單品行情' }
  }
  if (pathname.startsWith('/search')) {
    return { kicker: 'Search desk', label: '作物搜尋' }
  }
  if (pathname.startsWith('/seasonal')) {
    return { kicker: 'Seasonal guide', label: '當季盛產' }
  }
  if (pathname.startsWith('/watchlist')) {
    return { kicker: 'Watchlist', label: '追蹤清單' }
  }
  if (pathname.startsWith('/insights')) {
    return { kicker: 'Analytics', label: '洞察與分析' }
  }
  if (pathname.startsWith('/settings')) {
    return { kicker: 'Preferences', label: '使用設定' }
  }
  return { kicker: 'Market pulse', label: '首頁總覽' }
}

export function TopAppBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
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

  const updateSuggestions = useMemo(
    () => debounce(async (q: string) => {
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
    setActiveIndex(-1)
    updateSuggestions(q)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    trackEvent('search_submit', query.trim())
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    setFocused(false)
  }

  function handleSelect(name: string) {
    trackEvent('suggestion_select', name)
    router.push(`/produce/${encodeURIComponent(name)}`)
    setQuery('')
    setSuggestions([])
    setActiveIndex(-1)
    setFocused(false)
  }

  const showSuggestions = focused && suggestions.length > 0

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setFocused(false)
      setActiveIndex(-1)
    }
  }
  const routeMeta = getRouteMeta(pathname)

  return (
    <header className="glass-header app-shell-header sticky top-0 z-50 flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3">
      <div className="flex items-center gap-3 md:gap-4">
      {/* Logo */}
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 min-w-0">
          <span className="app-shell-brand-mark material-symbols-outlined text-primary" style={{ fontSize: '1.4rem' }} aria-hidden="true">eco</span>
          <span className="min-w-0">
            <span className="block text-body-md sm:text-body-lg font-black text-primary-container tracking-tight whitespace-nowrap">
              農時價
            </span>
          </span>
        </Link>

        <div className="hidden lg:flex flex-col min-w-0">
          <span className="section-kicker">{routeMeta.kicker}</span>
          <span className="text-body-sm font-semibold text-on-surface whitespace-nowrap">{routeMeta.label}</span>
        </div>
      </div>

      {/* Desktop Nav (Centered) */}
      <div className="hidden md:flex flex-1 justify-center items-center px-2 md:px-5">
        <nav aria-label="主要導覽" className="app-shell-nav-rail flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => trackEvent('nav_click', link.href, { source: 'topbar', label: link.label })}
              className={`app-shell-nav-link px-3.5 py-2 rounded-full text-label-bold font-medium transition-colors whitespace-nowrap ${
                isNavActive(pathname, link.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Right Actions: Search + Feedback + Notifications */}
      <div className="flex flex-1 md:flex-none items-center justify-end gap-1 md:gap-3">
        {/* Global Search Box (slightly narrower to make room for the feedback action) */}
        <div ref={containerRef} className="relative flex-1 min-w-0 md:flex-none md:w-[200px] lg:w-[280px]">
          <form onSubmit={handleSubmit} suppressHydrationWarning>
            <div className="app-shell-search-dock relative">
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
                onKeyDown={handleKeyDown}
                placeholder="搜尋作物…"
                aria-label="搜尋作物"
                role="combobox"
                aria-expanded={showSuggestions}
                aria-controls="topbar-search-suggestions"
                aria-autocomplete="list"
                aria-activedescendant={activeIndex >= 0 ? `topbar-suggestion-${activeIndex}` : undefined}
                autoComplete="off"
                className="w-full bg-transparent rounded-full py-2.5 pl-10 pr-4 text-body-md text-on-surface placeholder-outline focus:outline-none"
              />
            </div>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && (
            <div
              id="topbar-search-suggestions"
              role="listbox"
              aria-label="搜尋建議"
              className="absolute top-full mt-2 w-full glass-card-solid rounded-2xl overflow-hidden shadow-glass z-20"
            >
              {suggestions.map((name, i) => (
                <button
                  key={name}
                  id={`topbar-suggestion-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(name) }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 text-body-md text-on-surface transition-colors ${
                    i === activeIndex ? 'bg-surface-container' : 'hover:bg-surface-container'
                  }`}
                >
                  <CropIcon name={name} className="w-6 h-6 shrink-0" />
                  <span>{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Feedback */}
        <FeedbackButton />

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              if (!showNotifications) trackEvent('notifications_open')
              setShowNotifications(!showNotifications)
            }}
            aria-label="最新通知"
            aria-expanded={showNotifications}
            className="app-shell-icon-button touch-target flex-shrink-0 flex items-center justify-center rounded-full transition-colors text-primary"
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.5rem' }}>notifications</span>
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
