'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { m, useReducedMotion } from 'framer-motion'
import { trackEvent } from '@/lib/analytics'
import { MAIN_NAV_ITEMS, isNavActive } from './navigation'

// SSR 沒有 layout effect；在伺服器端退回 useEffect 以免 React 警告。
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

interface PillBox {
  x: number
  width: number
}

/**
 * 底部分頁列：所有寬度都顯示的浮動膠囊。
 * 目前分頁在 icon 右邊顯示文字，只佔內容寬度；其餘分頁平分剩下的空間，
 * 所以膠囊本身不會因為選中而變寬，變的是其它 icon 的間距。
 */
export function BottomNav() {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  const activeIndex = MAIN_NAV_ITEMS.findIndex((item) => isNavActive(pathname, item.href))

  // Instagram-style shrink-on-scroll: the whole bar scales down while scrolling
  // down and springs back to full size when scrolling up (or near the top).
  const [shrunk, setShrunk] = useState(false)

  useEffect(() => {
    if (reduceMotion) return // Respect users who opt out of non-essential motion.

    let lastY = window.scrollY
    let ticking = false

    const update = () => {
      const y = window.scrollY
      const delta = y - lastY
      if (y < 40) {
        setShrunk(false)
      } else if (Math.abs(delta) > 6) {
        setShrunk(delta > 0)
      }
      lastY = y
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [reduceMotion])

  // 分頁寬度不一，滑動的高亮改用實際量到的位置與寬度。
  // 量到之前（SSR 與首次繪製）由目前分頁自己的底色頂著，避免閃一下。
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const [pill, setPill] = useState<PillBox | null>(null)

  useIsomorphicLayoutEffect(() => {
    const active = activeIndex >= 0 ? itemRefs.current[activeIndex] : null
    if (!active) {
      setPill(null)
      return
    }

    const measure = () => {
      const next = { x: active.offsetLeft, width: active.offsetWidth }
      setPill((prev) => (prev && prev.x === next.x && prev.width === next.width ? prev : next))
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return

    // 視窗寬度或字級偏好改變時，分頁位置會跟著變
    const observer = new ResizeObserver(measure)
    observer.observe(active)
    if (active.parentElement) observer.observe(active.parentElement)
    return () => observer.disconnect()
  }, [activeIndex])

  const springSoft = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 30 }
  const springSlide = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 34 }
  const springPop = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 500, damping: 24 }

  return (
    <nav aria-label="主要導覽" className="fixed bottom-[calc(0.375rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-[342px] -translate-x-1/2 select-none items-center justify-center md:bottom-4">
      {/* Main Capsule Tab Bar with Liquid Glass styling; scales down on scroll-down */}
      <m.div
        className="h-[52px] w-full rounded-full border border-white/20 bg-[#2e6b4c]/90 p-0.5 shadow-[0_14px_36px_rgba(11,36,25,0.28),_inset_0_1px_2px_rgba(255,255,255,0.22),_inset_0_-1px_2px_rgba(0,0,0,0.2)] backdrop-blur-[45px] backdrop-saturate-150 will-change-transform"
        style={{ transformOrigin: 'bottom center' }}
        initial={false}
        animate={{ scale: shrunk ? 0.85 : 1, opacity: shrunk ? 0.9 : 1 }}
        transition={springSoft}
      >
        <div className="relative flex h-full w-full">
          {/* Sliding active highlight — glides between tabs */}
          {pill && (
            <m.span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0.5 left-0 top-0.5 rounded-full border border-[#bacd77]/50 bg-[#9cb356] shadow-[0_3px_10px_rgba(0,0,0,0.22),_inset_0_1px_1.5px_rgba(255,255,255,0.42),_inset_0_-1px_2px_rgba(0,0,0,0.12)]"
              initial={false}
              animate={{ x: pill.x, width: pill.width }}
              transition={springSlide}
            />
          )}

          {MAIN_NAV_ITEMS.map((item, idx) => {
            const active = idx === activeIndex
            return (
              <Link
                key={item.href}
                ref={(element) => {
                  itemRefs.current[idx] = element
                }}
                href={item.href}
                onClick={() => trackEvent('nav_click', item.href, { source: 'bottomnav', label: item.label })}
                aria-label={item.label}
                title={item.label}
                aria-current={active ? 'page' : undefined}
                className={`relative z-10 flex h-full items-center justify-center rounded-full transition-colors duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                  active
                    ? `flex-none gap-1.5 pl-3 pr-3.5 text-[#13362a] ${pill ? '' : 'bg-[#9cb356]'}`
                    : 'min-w-0 flex-1 text-white/85 hover:text-white'
                }`}
              >
                {/* Icon pops slightly and fills when active */}
                <m.span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{
                    fontSize: '1.5rem',
                    fontVariationSettings: active ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400",
                  }}
                  animate={{ scale: active ? 1.08 : 1 }}
                  transition={springPop}
                >
                  {item.icon}
                </m.span>
                {/* 只有目前分頁顯示文字，放在 icon 右邊 */}
                {active && (
                  <span className="whitespace-nowrap text-sm font-bold leading-none" aria-hidden="true">
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </m.div>
    </nav>
  )
}
