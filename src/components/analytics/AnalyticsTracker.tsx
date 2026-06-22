'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initAnalytics, trackEvent } from '@/lib/analytics'

/**
 * 全站行為稽核掛載點：
 * - 綁定分頁隱藏時的 flush（initAnalytics）。
 * - 路徑變更時自動記錄一筆 page_view。
 * 不渲染任何 UI。
 */
export function AnalyticsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    if (pathname) trackEvent('page_view', pathname)
  }, [pathname])

  return null
}
