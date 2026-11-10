'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion'
import { trackEvent } from '@/lib/analytics'
import { triggerHaptic, hapticPatterns } from '@/lib/haptics'
import {
  DEFAULT_USER_PREFERENCES,
  type FontSize,
  getUserPreferences,
  type Theme,
  updateUserPreferences,
  type UserPreferences,
} from '@/lib/preferences'
import { RECOMMENDED_PROJECTS } from '@/lib/recommendedProjects'

interface AppDrawerProps {
  open: boolean
  onClose: () => void
  /** 「意見回饋」：TopAppBar 會先關掉選單，再開啟回饋彈窗。 */
  onOpenFeedback: () => void
}

const BROWSE_LINKS = [
  { href: '/market', icon: 'storefront', label: '市場行情' },
  { href: '/healthy-basket', icon: 'nutrition', label: '一餐好菜籃' },
] as const

const FONT_SIZE_OPTIONS: ReadonlyArray<{ value: FontSize; text: string; label: string }> = [
  { value: 'small', text: '小', label: '小字級' },
  { value: 'medium', text: '中', label: '中字級' },
  { value: 'large', text: '大', label: '大字級' },
]

const THEME_OPTIONS: ReadonlyArray<{ value: Theme; icon: string; label: string }> = [
  { value: 'light', icon: 'light_mode', label: '淺色' },
  { value: 'dark', icon: 'dark_mode', label: '深色' },
  { value: 'auto', icon: 'brightness_auto', label: '自動' },
]

const ROW =
  'flex min-h-[2.875rem] w-full items-center gap-3.5 px-5 py-1.5 text-left transition-colors hover:bg-black/[0.04] focus-visible:bg-primary/10 focus-visible:outline-none dark:hover:bg-white/5'
const ROW_ICON = 'material-symbols-outlined flex-shrink-0 text-outline'
const ROW_LABEL = 'min-w-0 flex-1 text-body-md font-medium text-on-surface'
const SECTION = 'border-b border-black/5 pb-1 dark:border-white/10'
const SECTION_LABEL = 'px-5 pb-1 pt-4 text-xs font-bold tracking-[0.12em] text-outline'
const SEGMENT_OFF = 'text-on-surface-variant hover:text-on-surface'
const SEGMENT_ON = 'bg-white text-primary shadow-sm dark:bg-zinc-700 dark:text-primary-fixed-dim'

/**
 * 側邊選單：header 漢堡按鈕後面的浮動卡片，從左側滑出。
 * 收納原本擠在 header 的品牌、設定與意見回饋，以及底部分頁列放不下的頁面入口。
 * 字級與主題在這裡直接切換；預設市場與通知的細項仍在設定頁。
 */
export function AppDrawer({ open, onClose, onOpenFeedback }: AppDrawerProps) {
  const reduceMotion = useReducedMotion()
  const panelRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 偏好存在 localStorage，開啟時才讀；設定頁改動時同步
  useEffect(() => {
    if (!open) return
    setPreferences(getUserPreferences())
    function sync(event: Event) {
      setPreferences((event as CustomEvent<UserPreferences>).detail ?? getUserPreferences())
    }
    window.addEventListener('veggieprice:preferences-updated', sync)
    return () => window.removeEventListener('veggieprice:preferences-updated', sync)
  }, [open])

  // 開啟時：鎖住背景捲動、Escape 關閉、Tab 留在選單內
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  function persist(partial: Partial<UserPreferences>) {
    triggerHaptic(hapticPatterns.success)
    try {
      setPreferences(updateUserPreferences(partial))
    } catch {
      // 寫不進 localStorage（例如無痕模式）時維持原狀，設定頁會顯示儲存失敗的說明
    }
  }

  function handleNavigate(href: string, label: string) {
    trackEvent('nav_click', href, { source: 'drawer', label })
    onClose()
  }

  if (!mounted) return null

  return createPortal(
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {open && (
          <div key="app-drawer" className="fixed inset-0 z-[96]">
            <m.div
              className="absolute inset-0 bg-[#0b2419]/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              aria-hidden="true"
            />

            <m.nav
              ref={panelRef}
              id="app-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="選單"
              initial={reduceMotion ? { opacity: 0 } : { x: '-105%' }}
              animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { x: '-105%' }}
              transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 36 }}
              className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] left-2 top-[calc(env(safe-area-inset-top)+0.5rem)] flex w-[78vw] min-w-[272px] max-w-[306px] flex-col overflow-y-auto overscroll-contain rounded-[1.75rem] border border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900"
            >
              <div className="flex flex-shrink-0 items-center justify-between gap-2 bg-[#173a2c] py-4 pl-5 pr-2 text-white">
                <Link
                  href="/"
                  onClick={() => handleNavigate('/', '農時價')}
                  className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <Image
                    src="/icons/icon-192.png"
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 flex-shrink-0 rounded-xl shadow-[0_4px_14px_-4px_rgba(0,0,0,0.5)]"
                    draggable={false}
                  />
                  <span className="truncate text-2xl font-black tracking-tight">農時價</span>
                </Link>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  aria-label="關閉選單"
                  className="touch-target flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.5rem' }}>
                    close
                  </span>
                </button>
              </div>

              <section className={SECTION}>
                <h2 className={SECTION_LABEL}>瀏覽</h2>
                {BROWSE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => handleNavigate(link.href, link.label)}
                    className={ROW}
                  >
                    <span className={ROW_ICON} aria-hidden="true" style={{ fontSize: '1.375rem' }}>
                      {link.icon}
                    </span>
                    <span className={ROW_LABEL}>{link.label}</span>
                    <span className={ROW_ICON} aria-hidden="true" style={{ fontSize: '1.25rem' }}>
                      chevron_right
                    </span>
                  </Link>
                ))}
              </section>

              <section className={SECTION}>
                <h2 className={SECTION_LABEL}>設定</h2>

                <div className="flex min-h-[3.25rem] items-center gap-3.5 px-5 py-1">
                  <span className={ROW_ICON} aria-hidden="true" style={{ fontSize: '1.375rem' }}>
                    format_size
                  </span>
                  <span className={ROW_LABEL}>字體大小</span>
                  <div role="group" aria-label="字體大小" className="flex flex-shrink-0 rounded-[0.875rem] bg-surface-container p-0.5">
                    {FONT_SIZE_OPTIONS.map((option) => {
                      const selected = preferences.fontSize === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-label={option.label}
                          aria-pressed={selected}
                          onClick={() => {
                            if (!selected) persist({ fontSize: option.value })
                          }}
                          className={`h-11 w-10 rounded-xl text-body-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            selected ? SEGMENT_ON : SEGMENT_OFF
                          }`}
                        >
                          {option.text}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex min-h-[3.25rem] items-center gap-3.5 px-5 py-1">
                  <span className={ROW_ICON} aria-hidden="true" style={{ fontSize: '1.375rem' }}>
                    brightness_auto
                  </span>
                  <span className={ROW_LABEL}>外觀主題</span>
                  <div role="group" aria-label="外觀主題" className="flex flex-shrink-0 rounded-[0.875rem] bg-surface-container p-0.5">
                    {THEME_OPTIONS.map((option) => {
                      const selected = preferences.theme === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-label={option.label}
                          title={option.label}
                          aria-pressed={selected}
                          onClick={() => {
                            if (!selected) persist({ theme: option.value })
                          }}
                          className={`flex h-11 w-10 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            selected ? SEGMENT_ON : SEGMENT_OFF
                          }`}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.375rem' }}>
                            {option.icon}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Link href="/settings" onClick={() => handleNavigate('/settings', '預設市場')} className={ROW}>
                  <span className={ROW_ICON} aria-hidden="true" style={{ fontSize: '1.375rem' }}>
                    location_on
                  </span>
                  <span className={ROW_LABEL}>預設市場</span>
                  <span className="max-w-[5.5rem] flex-shrink-0 truncate text-body-sm text-on-surface-variant">
                    {preferences.preferredMarket}
                  </span>
                  <span className={ROW_ICON} aria-hidden="true" style={{ fontSize: '1.25rem' }}>
                    chevron_right
                  </span>
                </Link>

                <Link
                  href="/settings#notifications"
                  onClick={() => handleNavigate('/settings#notifications', '通知設定')}
                  className={ROW}
                >
                  <span className={ROW_ICON} aria-hidden="true" style={{ fontSize: '1.375rem' }}>
                    notifications
                  </span>
                  <span className={ROW_LABEL}>通知設定</span>
                  <span className={ROW_ICON} aria-hidden="true" style={{ fontSize: '1.25rem' }}>
                    chevron_right
                  </span>
                </Link>
              </section>

              <section className="border-b border-black/5 py-1 dark:border-white/10">
                <button type="button" onClick={onOpenFeedback} aria-haspopup="dialog" className={ROW}>
                  <span className={ROW_ICON} aria-hidden="true" style={{ fontSize: '1.375rem' }}>
                    feedback
                  </span>
                  <span className={ROW_LABEL}>意見回饋</span>
                  <span className={ROW_ICON} aria-hidden="true" style={{ fontSize: '1.25rem' }}>
                    chevron_right
                  </span>
                </button>
              </section>

              <section className={SECTION}>
                <h2 className={`${SECTION_LABEL} flex items-center gap-1.5`}>
                  <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim" aria-hidden="true" style={{ fontSize: '1rem' }}>
                    apps
                  </span>
                  更多工具服務
                </h2>
                <ul>
                  {RECOMMENDED_PROJECTS.map((project) => (
                    <li key={project.url}>
                      <a href={project.url} target="_blank" rel="noopener noreferrer" className={ROW}>
                        <span className="w-[1.375rem] flex-shrink-0 text-center text-lg leading-none" aria-hidden="true">
                          {project.icon}
                        </span>
                        <span className={ROW_LABEL}>{project.title}</span>
                        <span className={ROW_ICON} aria-hidden="true" style={{ fontSize: '1.125rem' }}>
                          open_in_new
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="mt-auto px-5 pb-4 pt-1">
                <div className="flex flex-wrap gap-x-5 text-body-sm font-semibold text-on-surface-variant">
                  <Link
                    href="/about"
                    onClick={() => handleNavigate('/about', '關於農時價')}
                    className="inline-flex min-h-11 items-center hover:text-primary focus-visible:underline focus-visible:outline-none"
                  >
                    關於農時價
                  </Link>
                  <Link
                    href="/privacy"
                    onClick={() => handleNavigate('/privacy', '隱私與合作揭露')}
                    className="inline-flex min-h-11 items-center hover:text-primary focus-visible:underline focus-visible:outline-none"
                  >
                    隱私與合作揭露
                  </Link>
                </div>
                <p className="text-label-sm text-outline">資料來源：農業部開放資料</p>
              </div>
            </m.nav>
          </div>
        )}
      </AnimatePresence>
    </LazyMotion>,
    document.body,
  )
}
