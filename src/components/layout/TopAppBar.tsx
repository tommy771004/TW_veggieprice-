'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type { KeyboardEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CropIcon } from '@/components/ui/CropIcon'
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog'
import { trackEvent } from '@/lib/analytics'
import { COMMON_CROPS } from '@/lib/crops'
import { getCropBaseInfo, CROP_BASE_INFO } from '@/lib/cropInfo'
import { AppDrawer } from './AppDrawer'
import { getRouteLabel } from './navigation'

// Header 只放三顆按鈕：左側選單，右側搜尋與通知。品牌、設定、意見回饋都在側邊選單。
const HEADER_ICON_BUTTON =
  'touch-target flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-primary-fixed-dim dark:hover:bg-white/10'

const ALL_CROPS = Array.from(new Set([
  ...COMMON_CROPS,
  ...Object.keys(CROP_BASE_INFO)
]))

const RECOMMENDED_CROP_LIST = ['高麗菜', '番茄', '青花菜', '胡蘿蔔', '香蕉', '蘋果']
const RECENT_SEARCHES_KEY = 'veggie_recent_searches_v1'

export function TopAppBar() {
  const pathname = usePathname()
  const router = useRouter()
  
  // Spotlight state
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false)
  const [spotlightQuery, setSpotlightQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  const spotlightInputRef = useRef<HTMLInputElement>(null)

  // Side menu + feedback dialog. Closing either hands focus back to the menu button.
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const openMenu = useCallback(() => setIsMenuOpen(true), [])
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
    menuButtonRef.current?.focus()
  }, [])
  const openFeedback = useCallback(() => {
    setIsMenuOpen(false)
    setIsFeedbackOpen(true)
  }, [])
  const closeFeedback = useCallback(() => {
    setIsFeedbackOpen(false)
    menuButtonRef.current?.focus()
  }, [])

  // The header lives in the root layout, so it survives navigation: close the menu
  // whenever the route changes (a menu link, the browser's back button).
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Load search history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored))
        } catch {
          // Safe fallback
        }
      }
    }
  }, [])

  // Close notifications dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!notificationRef.current?.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Lock body scroll and auto-focus input when Spotlight opens
  useEffect(() => {
    if (isSpotlightOpen) {
      document.body.style.overflow = 'hidden'
      setActiveIndex(-1)
      const timer = setTimeout(() => {
        spotlightInputRef.current?.focus()
      }, 50)
      return () => {
        document.body.style.overflow = ''
        clearTimeout(timer)
      }
    } else {
      document.body.style.overflow = ''
    }
  }, [isSpotlightOpen])

  // Global search shortcut (e.g., '/' or 'Cmd+K' / 'Ctrl+K')
  useEffect(() => {
    const handleShortcut = (e: globalThis.KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setIsSpotlightOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSpotlightOpen(true)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  // Client-side Fuzzy Search Engine
  const searchResults = useMemo(() => {
    if (!spotlightQuery.trim()) return []
    const q = spotlightQuery.trim().toLowerCase()

    return ALL_CROPS
      .map((crop) => {
        const text = crop.toLowerCase()
        let score = 0

        if (text === q) {
          score = 100 // Exact match
        } else if (text.startsWith(q)) {
          score = 80 // Prefix match
        } else if (text.includes(q)) {
          score = 60 // Substring match
        } else {
          // Character-by-character fuzzy match (ordered letters check)
          let qIdx = 0
          const matchIndices: number[] = []
          for (let i = 0; i < text.length; i++) {
            if (text[i] === q[qIdx]) {
              matchIndices.push(i)
              qIdx++
              if (qIdx === q.length) {
                const spread = matchIndices[matchIndices.length - 1] - matchIndices[0]
                score = Math.max(10, 40 - spread)
                break
              }
            }
          }
        }
        return { crop, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.crop)
      .slice(0, 8) // Top 8 results
  }, [spotlightQuery])

  // Save selection/query to localStorage
  const saveRecentSearch = (name: string) => {
    const next = [name, ...recentSearches.filter((s) => s !== name)].slice(0, 10)
    setRecentSearches(next)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
  }

  const removeRecentSearch = (name: string) => {
    const next = recentSearches.filter((s) => s !== name)
    setRecentSearches(next)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  }

  // Handle item selections
  const handleSpotlightSelect = (name: string) => {
    trackEvent('suggestion_select', name)
    saveRecentSearch(name)
    router.push(`/produce/${encodeURIComponent(name)}`)
    setIsSpotlightOpen(false)
    setSpotlightQuery('')
  }

  const handleGeneralSearch = (text: string) => {
    if (!text.trim()) return
    trackEvent('search_submit', text.trim())
    saveRecentSearch(text.trim())
    router.push(`/search?q=${encodeURIComponent(text.trim())}`)
    setIsSpotlightOpen(false)
    setSpotlightQuery('')
  }

  const handleSpotlightKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const listLength = spotlightQuery.trim() ? searchResults.length : recentSearches.length

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (listLength > 0 ? (i + 1) % listLength : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (listLength > 0 ? (i <= 0 ? listLength - 1 : i - 1) : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < listLength) {
        const selected = spotlightQuery.trim() ? searchResults[activeIndex] : recentSearches[activeIndex]
        handleSpotlightSelect(selected)
      } else if (spotlightQuery.trim()) {
        handleGeneralSearch(spotlightQuery.trim())
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsSpotlightOpen(false)
    }
  }

  const routeLabel = getRouteLabel(pathname)

  return (
    <>
      <header className="glass-header app-shell-header sticky top-0 z-50 flex h-12 items-center justify-between gap-2 px-1 md:h-14 md:px-3">
        {/* Left: menu button + the page the visitor is on (the bottom bar shrinks while scrolling) */}
        <div className="flex min-w-0 items-center gap-0.5">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={openMenu}
            aria-label="開啟選單"
            aria-haspopup="dialog"
            aria-expanded={isMenuOpen}
            aria-controls="app-drawer"
            className={HEADER_ICON_BUTTON}
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.5rem' }}>menu</span>
          </button>
          <span className="truncate text-body-lg font-extrabold tracking-tight text-primary dark:text-primary-fixed-dim">
            {routeLabel}
          </span>
        </div>

        {/* Right: only search and notifications; settings and feedback live in the side menu */}
        <div className="flex flex-shrink-0 items-center">
          <button
            type="button"
            onClick={() => setIsSpotlightOpen(true)}
            aria-label="搜尋作物"
            aria-keyshortcuts="/ Control+K Meta+K"
            className={HEADER_ICON_BUTTON}
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.5rem' }}>search</span>
          </button>

          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => {
                if (!showNotifications) trackEvent('notifications_open')
                setShowNotifications(!showNotifications)
              }}
              aria-label="通知"
              aria-expanded={showNotifications}
              className={HEADER_ICON_BUTTON}
            >
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.5rem' }}>notifications</span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1rem)] glass-card-solid rounded-2xl overflow-hidden shadow-glass z-50">
                <div className="p-4 border-b border-white/20">
                  <h3 className="text-label-bold font-semibold text-primary dark:text-primary-fixed-dim">通知</h3>
                </div>
                <div className="p-4 text-center text-body-md text-on-surface-variant">
                  <p>目前沒有可在網站內查看的通知。</p>
                  <p className="mt-2 text-body-sm">價格異動會由瀏覽器顯示，每日摘要會出現在首頁。</p>
                </div>
                <div className="p-3 border-t border-white/20 bg-white/30 text-center dark:bg-white/5">
                  <Link
                    href="/settings#notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-primary hover:underline text-body-sm font-medium dark:text-primary-fixed-dim"
                  >
                    前往通知設定
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <AppDrawer open={isMenuOpen} onClose={closeMenu} onOpenFeedback={openFeedback} />
      <FeedbackDialog open={isFeedbackOpen} onClose={closeFeedback} />

      {/* Spotlight Search Modal Overlay */}
      {isSpotlightOpen && (
        <div 
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md z-[100] flex items-start justify-center pt-[8vh] md:pt-[12vh] px-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSpotlightOpen(false)
          }}
        >
          <div className="bg-white/95 dark:bg-zinc-900/95 border border-black/10 dark:border-zinc-800/60 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[75vh] animate-in slide-in-from-top-4 duration-300">
            
            {/* Search Input Box */}
            <div className="flex items-center gap-3 p-4 border-b border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '1.5rem' }}>search</span>
              <input
                ref={spotlightInputRef}
                type="text"
                placeholder="搜尋作物名稱（例如：高麗菜、番茄、金針菇...）"
                value={spotlightQuery}
                onChange={(e) => {
                  setSpotlightQuery(e.target.value)
                  setActiveIndex(-1)
                }}
                onKeyDown={handleSpotlightKeyDown}
                className="flex-1 bg-transparent text-body-md md:text-body-lg text-on-surface placeholder-outline focus:outline-none py-1"
              />
              {spotlightQuery && (
                <button
                  onClick={() => {
                    setSpotlightQuery('')
                    setActiveIndex(-1)
                    spotlightInputRef.current?.focus()
                  }}
                  className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-outline hover:text-on-surface transition-colors"
                  aria-label="清除搜尋內容"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
              <button
                onClick={() => setIsSpotlightOpen(false)}
                className="px-3.5 py-1.5 rounded-full text-body-sm bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-on-surface font-semibold transition-all duration-200"
              >
                關閉
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
              
              {/* Case 1: Empty Query - Show Recent Searches and Recommended Crops */}
              {!spotlightQuery.trim() && (
                <div className="space-y-5">
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-3 py-1.5 text-label-bold text-outline text-xs tracking-wider uppercase font-bold">
                        <span>最近搜尋紀錄</span>
                        <button
                          onClick={clearRecentSearches}
                          className="text-primary hover:underline text-body-xs font-bold"
                        >
                          清除全部
                        </button>
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {recentSearches.map((search, idx) => (
                          <div
                            key={search}
                            className={`group w-full rounded-2xl flex items-center justify-between text-body-md text-on-surface hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors ${
                              idx === activeIndex ? 'bg-primary/5 dark:bg-primary/10' : ''
                            }`}
                            onMouseEnter={() => setActiveIndex(idx)}
                          >
                            <button
                              onClick={() => handleSpotlightSelect(search)}
                              className="flex-1 text-left px-3 py-2.5 flex items-center gap-3.5"
                            >
                              <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors" style={{ fontSize: '1.25rem' }}>history</span>
                              <CropIcon name={search} className="w-6 h-6 shrink-0" />
                              <span className="font-medium">{search}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeRecentSearch(search)
                              }}
                              className="p-1 mr-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-outline hover:text-error transition-colors"
                              aria-label="刪除此紀錄"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Crops */}
                  <div>
                    <div className="px-3 py-1.5 text-label-bold text-outline text-xs tracking-wider uppercase font-bold">
                      推薦熱門作物
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {RECOMMENDED_CROP_LIST.map((crop) => (
                        <button
                          key={crop}
                          onClick={() => handleSpotlightSelect(crop)}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 transition-all duration-300 text-left text-body-md text-on-surface"
                        >
                          <CropIcon name={crop} className="w-8 h-8 shrink-0" />
                          <span className="font-semibold truncate">{crop}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Case 2: Active Query - Show Fuzzy Matches */}
              {spotlightQuery.trim() && (
                <div>
                  <div className="px-3 py-1.5 text-label-bold text-outline text-xs tracking-wider uppercase font-bold">
                    搜尋結果 ({searchResults.length})
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="space-y-0.5 mt-2">
                      {searchResults.map((crop, idx) => (
                        <button
                          key={crop}
                          onClick={() => handleSpotlightSelect(crop)}
                          className={`w-full text-left px-4 py-3 rounded-2xl flex items-center gap-4 text-body-md text-on-surface hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors ${
                            idx === activeIndex ? 'bg-primary/5 dark:bg-primary/10' : ''
                          }`}
                          onMouseEnter={() => setActiveIndex(idx)}
                        >
                          <CropIcon name={crop} className="w-8 h-8 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-on-surface truncate">{crop}</div>
                            <div className="text-body-xs text-outline truncate">
                              {getCropBaseInfo(crop)?.feature ?? '查看行情與歷史走勢'}
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-outline shrink-0" style={{ fontSize: '1.2rem' }}>chevron_right</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-body-md text-on-surface-variant flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-outline" style={{ fontSize: '2.5rem' }}>search_off</span>
                      <p>找不到與「{spotlightQuery}」相關的作物</p>
                      <button
                        onClick={() => handleGeneralSearch(spotlightQuery)}
                        className="mt-2 px-5 py-2 bg-primary text-white rounded-full text-body-sm font-semibold hover:bg-primary-hover transition-colors shadow-sm active:scale-95"
                      >
                        直接在全站搜尋「{spotlightQuery}」
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

