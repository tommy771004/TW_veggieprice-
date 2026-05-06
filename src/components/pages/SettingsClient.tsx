'use client'

import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { DEFAULT_MARKETS } from '@/lib/constants'
import { fetchMarketList } from '@/lib/api'
import {
  DEFAULT_USER_PREFERENCES,
  type FontSize,
  getUserPreferences,
  type Theme,
  updateUserPreferences,
  type UserPreferences,
} from '@/lib/preferences'

export function SettingsClient() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [markets, setMarkets] = useState<string[]>(DEFAULT_MARKETS)

  useEffect(() => {
    const next = getUserPreferences()
    setPreferences(next)
    fetchMarketList('Veg').then(setMarkets).catch(console.error)

    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  function persist(partial: Partial<UserPreferences>) {
    const next = updateUserPreferences(partial)
    setPreferences(next)
  }

  async function handlePriceAlertToggle() {
    const nextValue = !preferences.priceAlert
    persist({ priceAlert: nextValue })

    if (nextValue && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  return (
    <div className="px-section-margin py-6 max-w-2xl mx-auto space-y-6">
      <h2 className="text-headline-lg font-bold text-on-surface">系統設定</h2>

      <GlassCard className="p-container-padding space-y-4 shadow-glass-sm">
        <h3 className="text-label-bold font-semibold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '1.25rem', fontVariationSettings: "'FILL' 1" }}>text_fields</span>
          個人化 (Personalization)
        </h3>
        <div className="space-y-2">
          <p className="text-body-md text-on-surface-variant">字體大小 (Font Size)</p>
          <div className="flex gap-2 bg-surface-container rounded-lg p-1">
            {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
              <button
                key={size}
                onClick={() => persist({ fontSize: size })}
                className={`flex-1 py-2 text-center rounded-md text-body-md transition-colors touch-target ${
                  preferences.fontSize === size
                    ? 'bg-white shadow-sm text-primary font-medium border border-primary/10'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {size === 'small' ? '小 (Small)' : size === 'medium' ? '中 (Medium)' : '大 (Large)'}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-container-padding space-y-4 shadow-glass-sm">
        <h3 className="text-label-bold font-semibold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '1.25rem', fontVariationSettings: "'FILL' 1" }}>palette</span>
          外觀主題 (Appearance)
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: 'light', icon: 'light_mode', label: '淺色' },
            { value: 'dark', icon: 'dark_mode', label: '深色' },
            { value: 'auto', icon: 'brightness_auto', label: '自動' },
          ] as Array<{ value: Theme; icon: string; label: string }>).map((themeOption) => (
            <button
              key={themeOption.value}
              onClick={() => persist({ theme: themeOption.value })}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border gap-2 transition-colors touch-target ${
                preferences.theme === themeOption.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-outline-variant bg-surface/50 text-on-surface-variant hover:bg-surface'
              }`}
            >
              <span className="material-symbols-outlined">{themeOption.icon}</span>
              <span className="text-body-md">{themeOption.label}</span>
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-container-padding space-y-4 shadow-glass-sm">
        <h3 className="text-label-bold font-semibold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '1.25rem', fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
          通知設定 (Notifications)
        </h3>
        <div className="space-y-4">
          {[
            { label: '價格異常警告', sub: 'Price Alerts', state: preferences.priceAlert, toggle: handlePriceAlertToggle },
            { label: '每日行情彙整', sub: 'Daily Market Summary', state: preferences.dailySummary, toggle: () => persist({ dailySummary: !preferences.dailySummary }) },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between items-center gap-4">
                <div>
                  <p className="text-body-lg text-on-surface">{item.label}</p>
                  <p className="text-body-sm text-on-surface-variant">{item.sub}</p>
                </div>
                <button
                  onClick={() => item.toggle()}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none ${
                    item.state ? 'bg-primary' : 'bg-surface-variant'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                      item.state ? 'right-1 translate-x-0' : 'left-1 translate-x-0'
                    }`}
                  />
                </button>
              </div>
              {item.label === '價格異常警告' && (
                <p className="text-body-sm text-on-surface-variant mt-2">
                  瀏覽器通知權限：{notificationPermission === 'granted' ? '已允許' : notificationPermission === 'denied' ? '已拒絕' : '尚未決定'}
                </p>
              )}
              <hr className="border-t border-outline-variant/30 mt-4" />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-container-padding space-y-4 shadow-glass-sm">
        <h3 className="text-label-bold font-semibold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '1.25rem', fontVariationSettings: "'FILL' 1" }}>store</span>
          預設市場 (Preferred Market)
        </h3>
        
        <select
          suppressHydrationWarning
          value={preferences.preferredMarket}
          onChange={(event) => persist({ preferredMarket: event.target.value })}
          className="w-full bg-white/70 border border-outline-variant/40 rounded-2xl px-4 py-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {markets.filter((market) => market !== '全部市場').map((market) => (
            <option key={market} value={market}>{market}</option>
          ))}
        </select>
      </GlassCard>

      <GlassCard className="p-container-padding shadow-glass-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>language</span>
          <div>
            <h3 className="text-body-lg text-on-surface">語言與地區</h3>
            <p className="text-body-sm text-on-surface-variant">Traditional Chinese (Taiwan)</p>
          </div>
        </div>
        <span className="text-body-sm text-on-surface">{preferences.locale}</span>
      </GlassCard>

      <GlassCard className="p-container-padding space-y-3 shadow-glass-sm">
        <h3 className="text-label-bold font-semibold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '1.25rem', fontVariationSettings: "'FILL' 1" }}>info</span>
          關於 (About)
        </h3>
        <div className="space-y-2 text-body-md text-on-surface-variant">
          <div className="flex justify-between">
            <span>版本 (Version)</span>
            <span className="text-on-surface font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>資料來源 (Data Source)</span>
            <span className="text-on-surface font-medium">農業部 (MOA)</span>
          </div>
          <div className="flex justify-between">
            <span>更新頻率</span>
            <span className="text-on-surface font-medium">每日更新</span>
          </div>
        </div>
      </GlassCard>

      <div className="h-6" />
    </div>
  )
}
