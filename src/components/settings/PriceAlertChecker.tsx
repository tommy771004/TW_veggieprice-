'use client'

import { useEffect } from 'react'
import { getUserPreferences } from '@/lib/preferences'

const ALERT_DATE_KEY = 'veggieprice_last_alert_date'

export function PriceAlertChecker() {
  useEffect(() => {
    async function check() {
      const prefs = getUserPreferences()
      if (!prefs.priceAlert) return
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

      const today = new Date().toISOString().split('T')[0]
      if (localStorage.getItem(ALERT_DATE_KEY) === today) return

      try {
        const res = await fetch(`/api/prices/overview?market=${encodeURIComponent(prefs.preferredMarket)}`)
        if (!res.ok) return
        const data = await res.json() as { avgPrice: number; priceChange: number; marketName: string }

        if (Math.abs(data.priceChange) >= 10) {
          const direction = data.priceChange > 0 ? '上漲' : '下跌'
          new Notification(`農時價 — ${data.marketName} 價格異動`, {
            body: `今日均價 $${data.avgPrice.toFixed(1)}，較昨日${direction} ${Math.abs(data.priceChange).toFixed(1)}%`,
            icon: '/icons/icon-192.svg',
          })
        }

        localStorage.setItem(ALERT_DATE_KEY, today)
      } catch {
        // silently ignore — alert is best-effort
      }
    }

    check()
  }, [])

  return null
}
