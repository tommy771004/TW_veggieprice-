'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
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
    <nav className="glass-nav md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-2 rounded-t-3xl">
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`app-shell-bottom-link relative flex flex-col items-center justify-center touch-target px-4 py-1.5 rounded-2xl transition-colors duration-200 ${
              active ? 'text-primary-container' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            {active && (
              <span aria-hidden="true" className="absolute inset-0 rounded-2xl glass-nav-capsule" />
            )}
            <span
              className={`material-symbols-outlined relative z-10 transition-transform duration-300 ease-out ${active ? 'scale-105 -translate-y-0.5' : ''}`}
              style={{
                fontSize: '1.5rem',
                fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
              }}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span className={`text-label-sm font-medium mt-1 relative z-10 ${active ? 'font-bold' : ''}`}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
