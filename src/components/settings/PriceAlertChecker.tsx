'use client'

import { useEffect } from 'react'
import { getUserPreferences, isNotificationsMuted, type NotificationFrequency } from '@/lib/preferences'

const ALERT_PERIOD_KEY = 'veggieprice_last_price_alert_period'
const LEGACY_ALERT_DATE_KEY = 'veggieprice_last_alert_date'

function getTaipeiDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  }
}

function getAlertPeriod(frequency: NotificationFrequency, date: Date) {
  if (frequency === 'onOpen') return null

  const { year, month, day } = getTaipeiDateParts(date)
  const localDate = new Date(Date.UTC(year, month - 1, day))
  if (frequency === 'weekly') {
    localDate.setUTCDate(localDate.getUTCDate() - localDate.getUTCDay())
  }

  return [
    localDate.getUTCFullYear(),
    String(localDate.getUTCMonth() + 1).padStart(2, '0'),
    String(localDate.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

export function PriceAlertChecker() {
  useEffect(() => {
    let cancelled = false
    let lastPreferenceSignature = ''

    async function check() {
      const prefs = getUserPreferences()
      const priceActivity = prefs.notifications.priceActivity
      if (!priceActivity.enabled || !priceActivity.channels.browser) return
      if (isNotificationsMuted(prefs)) return
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

      const period = getAlertPeriod(priceActivity.frequency, new Date())
      const lastPeriod = localStorage.getItem(ALERT_PERIOD_KEY)
        ?? localStorage.getItem(LEGACY_ALERT_DATE_KEY)
      if (period && lastPeriod === period) return

      try {
        const res = await fetch(`/api/prices/overview?market=${encodeURIComponent(prefs.preferredMarket)}`)
        if (!res.ok || cancelled) return
        const data = await res.json() as { avgPrice: number; priceChange: number; marketName: string }

        const latestPrefs = getUserPreferences()
        const latestPriceActivity = latestPrefs.notifications.priceActivity
        if (
          !latestPriceActivity.enabled ||
          !latestPriceActivity.channels.browser ||
          isNotificationsMuted(latestPrefs) ||
          typeof Notification === 'undefined' ||
          Notification.permission !== 'granted'
        ) return

        if (Math.abs(data.priceChange) >= 10 && !cancelled) {
          const direction = data.priceChange > 0 ? '上漲' : '下跌'
          new Notification(`農時價 — ${data.marketName} 價格異動`, {
            body: `今日均價 $${data.avgPrice.toFixed(1)}，較昨日${direction} ${Math.abs(data.priceChange).toFixed(1)}%`,
            icon: '/icons/icon-192.svg',
          })
        }

        if (period) {
          localStorage.setItem(ALERT_PERIOD_KEY, period)
        }
      } catch {
        // Alerts are best-effort. A later app open can retry the request.
      }
    }

    const runCheck = (force = false) => {
      const prefs = getUserPreferences()
      const priceActivity = prefs.notifications.priceActivity
      const signature = [
        prefs.preferredMarket,
        prefs.notifications.muteUntil,
        priceActivity.enabled,
        priceActivity.channels.browser,
        priceActivity.frequency,
      ].join('|')
      if (!force && signature === lastPreferenceSignature) return
      lastPreferenceSignature = signature
      void check()
    }

    const handlePreferencesUpdated = () => runCheck()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') runCheck(true)
    }

    runCheck(true)
    window.addEventListener('veggieprice:preferences-updated', handlePreferencesUpdated)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      cancelled = true
      window.removeEventListener('veggieprice:preferences-updated', handlePreferencesUpdated)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null
}
