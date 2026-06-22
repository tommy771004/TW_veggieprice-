'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'

const MAIN_ITEMS = [
  { href: '/', icon: 'dashboard', label: '首頁' },
  { href: '/search', icon: 'search', label: '搜尋' },
  { href: '/seasonal', icon: 'local_florist', label: '當季' },
  { href: '/watchlist', icon: 'monitoring', label: '關注' },
  { href: '/insights', icon: 'insights', label: '洞察' },
  { href: '/settings', icon: 'settings', label: '設定' },
]

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  if (href === '/search') return pathname === '/search' || pathname.startsWith('/produce/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="主要導覽" className="md:hidden fixed bottom-[calc(0.375rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] xs:w-[calc(100%-2rem)] max-w-[392px] z-50 flex items-center justify-center select-none">
      {/* Main Capsule Tab Bar with Liquid Glass styling */}
      <div className="bg-white/45 dark:bg-black/30 backdrop-blur-[45px] border border-white/40 dark:border-zinc-800/40 shadow-[0_14px_45px_rgba(0,0,0,0.1),_inset_0_1px_2.5px_rgba(255,255,255,0.65),_0_1px_1px_rgba(0,0,0,0.02)] dark:shadow-[0_14px_45px_rgba(0,0,0,0.45),_inset_0_1px_1.5px_rgba(255,255,255,0.2)] rounded-full w-full flex justify-around items-center h-[58px] p-1">
        {MAIN_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => trackEvent('nav_click', item.href, { source: 'bottomnav', label: item.label })}
              className={`relative flex flex-col items-center justify-center h-full flex-1 rounded-full transition-all duration-300 active:scale-95 ${
                active
                  ? 'text-[#0d631b] dark:text-[#88d982]'
                  : 'text-[#1c1c1e] dark:text-[#f2f2f7] opacity-60 hover:opacity-100'
              }`}
            >
              {active && (
                <span className="absolute inset-0 rounded-full bg-[#0d631b]/[0.06] dark:bg-[#88d982]/[0.1] border border-[#0d631b]/[0.08] dark:border-[#88d982]/[0.15] shadow-[0_2px_12px_rgba(13,99,27,0.06),_inset_0_1px_1.5px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] animate-in fade-in zoom-in-95 duration-200" />
              )}
              {/* Icon */}
              <span
                className="material-symbols-outlined relative z-10 transition-all duration-300"
                style={{
                  fontSize: '1.35rem',
                  fontVariationSettings: active ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400",
                }}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              {/* Label */}
              <span className={`text-[9.5px] sm:text-[10px] font-semibold mt-0.5 relative z-10 tracking-tight transition-all duration-300 ${active ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
