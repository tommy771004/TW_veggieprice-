'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { m, useReducedMotion } from 'framer-motion'
import { trackEvent } from '@/lib/analytics'

const MAIN_ITEMS = [
  { href: '/', icon: 'dashboard', label: '首頁' },
  { href: '/search', icon: 'search', label: '搜尋' },
  { href: '/seasonal', icon: 'local_florist', label: '當季' },
  { href: '/watchlist', icon: 'monitoring', label: '關注' },
  { href: '/insights', icon: 'insights', label: '洞察' },
]

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  if (href === '/search') return pathname === '/search' || pathname.startsWith('/produce/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomNav() {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  const activeIndex = MAIN_ITEMS.findIndex((item) => isNavActive(pathname, item.href))

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

  const springSoft = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 30 }
  const springSlide = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 34 }
  const springPop = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 500, damping: 24 }

  return (
    <nav aria-label="主要導覽" className="md:hidden fixed bottom-[calc(0.375rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] xs:w-[calc(100%-2rem)] max-w-[342px] z-50 flex items-center justify-center select-none">
      {/* Main Capsule Tab Bar with Liquid Glass styling; scales down on scroll-down */}
      <m.div
        className="bg-[#173a2c]/85 backdrop-blur-[45px] backdrop-saturate-150 border border-white/15 shadow-[0_16px_45px_rgba(11,36,25,0.42),_inset_0_1px_2px_rgba(255,255,255,0.18),_inset_0_-1px_2px_rgba(0,0,0,0.28)] rounded-full w-full h-[52px] p-0.5 will-change-transform"
        style={{ transformOrigin: 'bottom center' }}
        initial={false}
        animate={{ scale: shrunk ? 0.85 : 1, opacity: shrunk ? 0.9 : 1 }}
        transition={springSoft}
      >
        <div className="relative flex w-full h-full">
          {/* Sliding active highlight — glides between tabs */}
          <m.span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-full bg-[#9cb356] border border-[#bacd77]/50 shadow-[0_3px_10px_rgba(0,0,0,0.22),_inset_0_1px_1.5px_rgba(255,255,255,0.42),_inset_0_-1px_2px_rgba(0,0,0,0.12)]"
            style={{ width: `${100 / MAIN_ITEMS.length}%` }}
            initial={false}
            animate={{
              x: `${Math.max(activeIndex, 0) * 100}%`,
              opacity: activeIndex < 0 ? 0 : 1,
            }}
            transition={springSlide}
          />

          {MAIN_ITEMS.map((item, idx) => {
            const active = idx === activeIndex
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => trackEvent('nav_click', item.href, { source: 'bottomnav', label: item.label })}
                aria-label={item.label}
                title={item.label}
                aria-current={active ? 'page' : undefined}
                className={`relative z-10 flex items-center justify-center h-full flex-1 rounded-full transition-colors duration-300 active:scale-95 ${
                  active
                    ? 'text-[#13362a]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {/* Icon only — pops slightly and fills when active */}
                <m.span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{
                    fontSize: '1.6rem',
                    fontVariationSettings: active ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400",
                  }}
                  animate={{ scale: active ? 1.12 : 1 }}
                  transition={springPop}
                >
                  {item.icon}
                </m.span>
              </Link>
            )
          })}
        </div>
      </m.div>
    </nav>
  )
}
