'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MAIN_ITEMS = [
  { href: '/', icon: 'dashboard', label: '首頁' },
  { href: '/search', icon: 'search', label: '搜尋' },
  { href: '/seasonal', icon: 'local_florist', label: '當季' },
  
  { href: '/watchlist', icon: 'monitoring', label: '關注' },
  { href: '/settings', icon: 'settings', label: '設定' },
]

function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (href === '/search') return pathname === '/search' || pathname.startsWith('/produce/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] xs:w-[calc(100%-2rem)] max-w-[420px] z-50 flex items-center justify-center select-none">
      {/* Main Capsule Tab Bar */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-[35px] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.08)] rounded-[32px] w-full flex justify-around items-center h-[76px] px-2">
        {MAIN_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center h-[58px] flex-1 rounded-[24px] transition-all duration-300 active:scale-95 ${
                active
                  ? 'text-[#0d631b] dark:text-[#88d982]'
                  : 'text-[#1c1c1e] dark:text-[#f2f2f7] opacity-60 hover:opacity-100'
              }`}
            >
              {active && (
                <span className="absolute inset-x-0.5 inset-y-0 rounded-[20px] bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.02] dark:border-white/[0.02] animate-in fade-in zoom-in-95 duration-200" />
              )}
              {/* Icon */}
              <span
                className="material-symbols-outlined relative z-10 transition-all duration-300"
                style={{
                  fontSize: '1.45rem',
                  fontVariationSettings: active ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400",
                }}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              {/* Label */}
              <span className={`text-[10.5px] sm:text-[11px] font-semibold mt-1 relative z-10 tracking-tight transition-all duration-300 ${active ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
