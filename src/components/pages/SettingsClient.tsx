'use client'

import Link from 'next/link'

import { useEffect, useRef, useState, useMemo } from 'react'
import { fetchMarketOptions } from '@/lib/api'
import { resolveCountyFromMarketName } from '@/lib/server/marketCountyMap'
import {
  DEFAULT_USER_PREFERENCES,
  type FontSize,
  getUserPreferences,
  isNotificationsMuted,
  resetUserPreferences,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationFrequency,
  type Theme,
  updateUserPreferences,
  type UserPreferences,
} from '@/lib/preferences'
import { triggerHaptic, hapticPatterns } from '@/lib/haptics'

const FREQUENCY_OPTIONS: Array<{ value: NotificationFrequency; label: string }> = [
  { value: 'onOpen', label: '每次開啟時檢查' },
  { value: 'daily', label: '每天最多一次' },
  { value: 'weekly', label: '每週最多一次' },
]

const CHANNEL_OPTIONS: Record<NotificationCategory, Array<{
  channel: NotificationChannel
  label: string
  description: string
}>> = {
  priceActivity: [
    {
      channel: 'browser',
      label: '裝置通知',
      description: '離開網站時也能收到價格異動提醒',
    },
  ],
  dailySummary: [
    {
      channel: 'inApp',
      label: '首頁摘要',
      description: '開啟首頁時顯示今日行情總覽',
    },
  ],
}

type MuteSelection = 'off' | 'oneHour' | 'today' | 'indefinite' | 'active'

function getMuteSelection(muteUntil: UserPreferences['notifications']['muteUntil']): MuteSelection {
  if (muteUntil === 'indefinite') return 'indefinite'
  if (muteUntil && Date.parse(muteUntil) > Date.now()) return 'active'
  return 'off'
}

function getTodayEndIso() {
  const tomorrow = new Date()
  tomorrow.setHours(24, 0, 0, 0)
  return tomorrow.toISOString()
}

function getMuteUntil(selection: Exclude<MuteSelection, 'active'>): UserPreferences['notifications']['muteUntil'] {
  if (selection === 'off') return null
  if (selection === 'indefinite') return 'indefinite'
  if (selection === 'today') return getTodayEndIso()
  return new Date(Date.now() + 60 * 60 * 1000).toISOString()
}

function getMuteDescription(muteUntil: UserPreferences['notifications']['muteUntil']) {
  if (muteUntil === 'indefinite') return '所有通知已暫停，直到你手動恢復。'
  if (muteUntil && Date.parse(muteUntil) > Date.now()) {
    return `所有通知暫停至 ${new Intl.DateTimeFormat('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(muteUntil))}。`
  }
  return '目前沒有暫停通知。'
}

export function SettingsClient() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [browserNotificationsSupported, setBrowserNotificationsSupported] = useState<boolean | null>(null)
  const [permissionRequesting, setPermissionRequesting] = useState(false)
  const [, refreshMuteState] = useState(0)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('偏好會自動儲存')
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false)
  const resetConfirmButtonRef = useRef<HTMLButtonElement>(null)
  const resetTriggerButtonRef = useRef<HTMLButtonElement>(null)
  const [marketsByType, setMarketsByType] = useState<Record<string, string[]>>({})
  const [marketOptionsState, setMarketOptionsState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [marketOptionsRequest, setMarketOptionsRequest] = useState(0)
  const [selectedType, setSelectedType] = useState<'Veg' | 'Fruit'>('Veg')
  const [selectedCounty, setSelectedCounty] = useState<string>('全部地區')

  useEffect(() => {
    const next = getUserPreferences()
    setPreferences(next)
    
    const initialType = next.preferredMarketType ?? 'Veg'
    setSelectedType(initialType)
    
    const initialMarket = next.preferredMarket
    if (initialMarket) {
      const county = resolveCountyFromMarketName(initialMarket)
      if (county) {
        setSelectedCounty(county)
      }
    }

  }, [])

  useEffect(() => {
    let cancelled = false
    setMarketOptionsState('loading')

    fetchMarketOptions().then((meta) => {
      if (cancelled) return
      setMarketsByType(meta.marketsByType)
      setMarketOptionsState('ready')
    }).catch(() => {
      if (cancelled) return
      setMarketOptionsState('error')
    })

    return () => {
      cancelled = true
    }
  }, [marketOptionsRequest])

  useEffect(() => {
    const syncNotificationPermission = () => {
      if (typeof Notification === 'undefined') {
        setBrowserNotificationsSupported(false)
        return
      }

      setBrowserNotificationsSupported(true)
      setNotificationPermission(Notification.permission)
    }

    syncNotificationPermission()
    document.addEventListener('visibilitychange', syncNotificationPermission)
    return () => document.removeEventListener('visibilitychange', syncNotificationPermission)
  }, [])

  useEffect(() => {
    const muteUntil = preferences.notifications.muteUntil
    if (!muteUntil || muteUntil === 'indefinite') return

    const expiresAt = Date.parse(muteUntil)
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return

    const timer = window.setTimeout(() => {
      refreshMuteState((value) => value + 1)
    }, expiresAt - Date.now() + 50)

    return () => window.clearTimeout(timer)
  }, [preferences.notifications.muteUntil])

  const marketsForType = useMemo(() => marketsByType[selectedType] ?? [], [marketsByType, selectedType])

  const countiesForType = useMemo(() => {
    const set = new Set<string>()
    marketsForType.forEach((m) => {
      if (m === '全部市場') return
      const county = resolveCountyFromMarketName(m)
      if (county) {
        set.add(county)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-TW'))
  }, [marketsForType])

  const filteredMarkets = useMemo(() => {
    return marketsForType.filter((m) => {
      if (m === '全部市場') return false
      if (selectedCounty === '全部地區') return true
      return resolveCountyFromMarketName(m) === selectedCounty
    })
  }, [marketsForType, selectedCounty])

  function handleTypeChange(type: 'Veg' | 'Fruit') {
    triggerHaptic(hapticPatterns.toggle)
    setSelectedType(type)
    setSelectedCounty('全部地區')
    
    const list = marketsByType[type] ?? []
    const available = list.filter((m) => m !== '全部市場')
    if (available.length > 0) {
      const firstMarket = available[0]
      persist({ preferredMarketType: type, preferredMarket: firstMarket })
    }
  }

  function handleCountyChange(county: string) {
    triggerHaptic(hapticPatterns.tick)
    setSelectedCounty(county)
    const list = marketsByType[selectedType] ?? []
    const available = list.filter((m) => {
      if (m === '全部市場') return false
      if (county === '全部地區') return true
      return resolveCountyFromMarketName(m) === county
    })
    
    if (available.length > 0) {
      if (!available.includes(preferences.preferredMarket)) {
        persist({ preferredMarket: available[0] })
      }
    }
  }

  function persist(partial: Partial<UserPreferences>) {
    if (partial.theme || partial.fontSize) {
      triggerHaptic(hapticPatterns.success)
    } else {
      triggerHaptic(hapticPatterns.tick)
    }
    try {
      const next = updateUserPreferences(partial)
      setPreferences(next)
      setSaveState('saved')
      setSaveMessage('偏好已自動儲存')
      return true
    } catch {
      setSaveState('error')
      setSaveMessage('偏好尚未儲存，請稍後再試')
      return false
    }
  }

  function handleRetryMarketOptions() {
    setMarketOptionsRequest((request) => request + 1)
  }

  function handleResetPreferences() {
    try {
      const next = resetUserPreferences()
      setPreferences(next)
      setSelectedType(next.preferredMarketType)
      setSelectedCounty(resolveCountyFromMarketName(next.preferredMarket) || '全部地區')
      setResetConfirmationOpen(false)
      setSaveState('saved')
      setSaveMessage('偏好已重設並自動儲存')
    } catch {
      setSaveState('error')
      setSaveMessage('偏好尚未重設，請稍後再試')
    }
  }

  async function requestBrowserPermission() {
    if (typeof Notification === 'undefined') {
      setSaveState('error')
      setSaveMessage('這個瀏覽器不支援裝置通知')
      return false
    }

    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') {
      setSaveState('error')
      setSaveMessage('瀏覽器已拒絕通知，請在網址列的網站設定中重新允許')
      return false
    }

    setPermissionRequesting(true)
    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission !== 'granted') {
        setSaveState('error')
        setSaveMessage('尚未開啟裝置通知，價格提醒沒有變更')
      }
      return permission === 'granted'
    } catch {
      setSaveState('error')
      setSaveMessage('無法取得通知權限，請稍後再試')
      return false
    } finally {
      setPermissionRequesting(false)
    }
  }

  function hasAnyChannel(category: NotificationCategory) {
    return Object.values(preferences.notifications[category].channels).some(Boolean)
  }

  async function handleNotificationEnabledChange(category: NotificationCategory, nextValue: boolean) {
    triggerHaptic(hapticPatterns.toggle)
    const current = preferences.notifications[category]

    if (nextValue && !hasAnyChannel(category)) {
      setSaveState('error')
      setSaveMessage('請先選擇至少一個接收方式')
      return
    }

    if (nextValue && current.channels.browser && !(await requestBrowserPermission())) {
      return
    }

    persist({
      notifications: {
        ...preferences.notifications,
        [category]: { ...current, enabled: nextValue },
      },
    })
  }

  async function handleNotificationChannelChange(
    category: NotificationCategory,
    channel: NotificationChannel,
    checked: boolean,
  ) {
    if (checked && channel === 'browser' && !(await requestBrowserPermission())) {
      return
    }

    const current = preferences.notifications[category]
    const channels = { ...current.channels, [channel]: checked }
    const enabled = Object.values(channels).some(Boolean) ? current.enabled : false

    persist({
      notifications: {
        ...preferences.notifications,
        [category]: { ...current, channels, enabled },
      },
    })
  }

  function handleNotificationFrequencyChange(category: NotificationCategory, frequency: NotificationFrequency) {
    const current = preferences.notifications[category]
    persist({
      notifications: {
        ...preferences.notifications,
        [category]: { ...current, frequency },
      },
    })
  }

  function handleMuteChange(selection: MuteSelection) {
    if (selection === 'active') return

    persist({
      notifications: {
        ...preferences.notifications,
        muteUntil: getMuteUntil(selection),
      },
    })
  }

  const notificationsMuted = isNotificationsMuted(preferences)
  const muteSelection = getMuteSelection(preferences.notifications.muteUntil)
  const priceActivity = preferences.notifications.priceActivity
  const dailySummary = preferences.notifications.dailySummary

  useEffect(() => {
    if (resetConfirmationOpen) {
      resetConfirmButtonRef.current?.focus()
    }
  }, [resetConfirmationOpen])

  return (
    <div className="home-dashboard-shell pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-8">
      <div className="px-section-margin py-4 md:py-6 space-y-section-margin">
        <h1 className="sr-only">使用設定</h1>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="section-shell xl:col-span-2">
            <div className="mb-5">
              <p className="section-kicker">Reading comfort</p>
              <h2 className="text-headline-md font-semibold text-on-surface">個人化顯示</h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                先把字級與主題調到舒服的密度，手機上會比桌面更容易感受到差異。
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-body-sm font-medium text-on-surface-variant">字體大小</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={preferences.fontSize === size}
                      onClick={() => persist({ fontSize: size })}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/70 ${
                        preferences.fontSize === size
                          ? 'border-primary/30 bg-primary/8 text-primary dark:bg-primary-container dark:text-on-primary-container shadow-sm'
                          : 'border-outline-variant/35 bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span className="block text-body-md font-semibold">
                        {size === 'small' ? '小字級' : size === 'medium' ? '中字級' : '大字級'}
                      </span>
                      <span className="block text-body-sm mt-1 opacity-80">
                        {size === 'small' ? '資訊密度高' : size === 'medium' ? '平衡閱讀與密度' : '更好掃讀'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-body-sm font-medium text-on-surface-variant">外觀主題</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    { value: 'light', icon: 'light_mode', label: '淺色', note: '白天閱讀較輕快' },
                    { value: 'dark', icon: 'dark_mode', label: '深色', note: '夜間更柔和' },
                    { value: 'auto', icon: 'brightness_auto', label: '自動', note: '跟著系統切換' },
                  ] as Array<{ value: Theme; icon: string; label: string; note: string }>).map((themeOption) => (
                    <button
                      key={themeOption.value}
                      type="button"
                      aria-pressed={preferences.theme === themeOption.value}
                      onClick={() => persist({ theme: themeOption.value })}
                      className={`rounded-2xl border px-4 py-4 transition-colors touch-target flex items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/70 ${
                        preferences.theme === themeOption.value
                          ? 'border-primary/30 bg-primary/8 text-primary dark:bg-primary-container dark:text-on-primary-container shadow-sm'
                          : 'border-outline-variant/35 bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.4rem' }}>{themeOption.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-body-md font-semibold">{themeOption.label}</span>
                        <span className="block text-body-sm mt-1 opacity-80">{themeOption.note}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <section id="notifications" aria-labelledby="notifications-heading" className="section-shell xl:col-span-2 scroll-mt-24">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="section-kicker">Notifications</p>
                <h2 id="notifications-heading" className="text-headline-md font-semibold text-on-surface">通知設定</h2>
                <p className="text-body-sm text-on-surface-variant mt-1 max-w-2xl">
                  只保留真正有用的提醒，分別設定通知類型、接收方式與提醒節奏。偏好會自動儲存。
                </p>
              </div>
              <div
                role="status"
                aria-live="polite"
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-body-sm ${
                  saveState === 'error'
                    ? 'bg-error/8 text-error'
                    : saveState === 'saved'
                      ? 'bg-primary/8 text-primary'
                      : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.1rem' }}>
                  {saveState === 'error' ? 'error' : saveState === 'saved' ? 'check_circle' : 'cloud_done'}
                </span>
                <span>{saveMessage}</span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className={`rounded-2xl border px-4 py-4 ${
                notificationsMuted ? 'border-primary/25 bg-primary/8' : 'border-outline-variant/30 bg-surface-container/55'
              }`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-body-lg font-semibold text-on-surface">暫停所有通知</h3>
                    <p id="notification-mute-description" className="text-body-sm text-on-surface-variant mt-1">
                      {getMuteDescription(preferences.notifications.muteUntil)}
                    </p>
                  </div>
                  <div className="w-full md:w-56">
                    <label htmlFor="notification-mute" className="sr-only">暫停所有通知的時間</label>
                    <select
                      id="notification-mute"
                      value={muteSelection}
                      onChange={(event) => handleMuteChange(event.target.value as MuteSelection)}
                      aria-describedby="notification-mute-description"
                      className="w-full min-h-11 bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 text-body-md text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/70"
                    >
                      <option value="off">不暫停通知</option>
                      {muteSelection === 'active' && <option value="active">目前已暫停</option>}
                      <option value="oneHour">暫停 1 小時</option>
                      <option value="today">暫停到今天結束</option>
                      <option value="indefinite">直到手動恢復</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section aria-labelledby="price-activity-heading" className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 id="price-activity-heading" className="text-body-lg font-semibold text-on-surface">市場價格異動</h3>
                      <p className="text-body-sm text-on-surface-variant mt-1">價格波動達到提醒門檻時通知你。</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={priceActivity.enabled}
                      aria-label="市場價格異動通知"
                      aria-busy={permissionRequesting}
                      disabled={permissionRequesting}
                      onClick={() => handleNotificationEnabledChange('priceActivity', !priceActivity.enabled)}
                      className="touch-target relative flex w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/70 disabled:cursor-wait disabled:opacity-60"
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-0.5 top-1/2 h-8 -translate-y-1/2 rounded-full transition-colors duration-200 ${
                          priceActivity.enabled ? 'bg-primary' : 'bg-surface-variant'
                        }`}
                      />
                      <span
                        aria-hidden="true"
                        className={`relative z-10 h-6 w-6 rounded-full bg-white shadow-sm transition-[transform] duration-200 ease-out ${
                          priceActivity.enabled ? 'translate-x-3.5' : '-translate-x-3.5'
                        }`}
                      />
                    </button>
                  </div>

                  <fieldset className="mt-5 space-y-2">
                    <legend className="text-body-sm font-medium text-on-surface-variant">接收方式</legend>
                    {CHANNEL_OPTIONS.priceActivity.map((option) => {
                      const descriptionId = `${option.channel}-price-activity-description`
                      const checked = priceActivity.channels[option.channel]
                      return (
                        <label key={option.channel} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-container">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => handleNotificationChannelChange('priceActivity', option.channel, event.target.checked)}
                            disabled={permissionRequesting}
                            aria-describedby={descriptionId}
                            className="h-5 w-5 accent-primary"
                          />
                          <span className="min-w-0">
                            <span className="block text-body-md font-medium text-on-surface">{option.label}</span>
                            <span id={descriptionId} className="block text-body-sm text-on-surface-variant">{option.description}</span>
                          </span>
                        </label>
                      )
                    })}
                    <p className="text-body-sm text-on-surface-variant pl-2">
                      {browserNotificationsSupported === null
                        ? '正在檢查裝置通知支援度…'
                        : browserNotificationsSupported
                          ? `瀏覽器權限：${notificationPermission === 'granted' ? '已允許' : notificationPermission === 'denied' ? '已拒絕，請到網站設定重新允許' : '尚未授權，開啟時會詢問'}。`
                          : '目前瀏覽器不支援裝置通知。'}
                    </p>
                  </fieldset>

                  <div className="mt-5 space-y-1.5">
                    <label htmlFor="price-activity-frequency" className="text-body-sm font-medium text-on-surface-variant">提醒節奏</label>
                    <select
                      id="price-activity-frequency"
                      value={priceActivity.frequency}
                      onChange={(event) => handleNotificationFrequencyChange('priceActivity', event.target.value as NotificationFrequency)}
                      aria-describedby="price-activity-frequency-description"
                      className="w-full min-h-11 bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 text-body-md text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/70"
                    >
                      {FREQUENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <p id="price-activity-frequency-description" className="text-body-sm text-on-surface-variant">
                      目前會在開啟 App 時檢查，這裡控制最多通知頻率。
                    </p>
                  </div>
                </section>

                <section aria-labelledby="daily-summary-heading" className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 id="daily-summary-heading" className="text-body-lg font-semibold text-on-surface">每日行情摘要</h3>
                      <p className="text-body-sm text-on-surface-variant mt-1">在首頁先看到今日市場總覽，不會另外發送裝置通知。</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={dailySummary.enabled}
                      aria-label="首頁每日行情摘要"
                      onClick={() => handleNotificationEnabledChange('dailySummary', !dailySummary.enabled)}
                      className="touch-target relative flex w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/70"
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-0.5 top-1/2 h-8 -translate-y-1/2 rounded-full transition-colors duration-200 ${
                          dailySummary.enabled ? 'bg-primary' : 'bg-surface-variant'
                        }`}
                      />
                      <span
                        aria-hidden="true"
                        className={`relative z-10 h-6 w-6 rounded-full bg-white shadow-sm transition-[transform] duration-200 ease-out ${
                          dailySummary.enabled ? 'translate-x-3.5' : '-translate-x-3.5'
                        }`}
                      />
                    </button>
                  </div>

                  <fieldset className="mt-5 space-y-2">
                    <legend className="text-body-sm font-medium text-on-surface-variant">顯示位置</legend>
                    {CHANNEL_OPTIONS.dailySummary.map((option) => {
                      const descriptionId = `${option.channel}-daily-summary-description`
                      const checked = dailySummary.channels[option.channel]
                      return (
                        <label key={option.channel} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-container">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => handleNotificationChannelChange('dailySummary', option.channel, event.target.checked)}
                            aria-describedby={descriptionId}
                            className="h-5 w-5 accent-primary"
                          />
                          <span className="min-w-0">
                            <span className="block text-body-md font-medium text-on-surface">{option.label}</span>
                            <span id={descriptionId} className="block text-body-sm text-on-surface-variant">{option.description}</span>
                          </span>
                        </label>
                      )
                    })}
                  </fieldset>

                  <div className="mt-5 rounded-xl bg-surface-container px-3 py-3">
                    <p className="text-body-sm font-medium text-on-surface">提醒節奏：每日</p>
                    <p className="text-body-sm text-on-surface-variant mt-1">首頁摘要每天更新一次，這是目前唯一支援的頻率。</p>
                  </div>
                </section>
              </div>

              <p className="text-body-sm text-on-surface-variant">
                目前提供裝置通知與首頁摘要。Email、SMS 與即時背景推播尚未支援，因此不會顯示成可選但無法使用的控制。
              </p>
            </div>
          </section>
        </section>

        <section className="section-shell">
          <div className="section-heading-row mb-5">
            <div>
              <p className="section-kicker">Market defaults</p>
              <h2 className="text-headline-md font-semibold text-on-surface">預設市場</h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                首頁、搜尋和後續操作會優先帶入這裡的市場偏好。
              </p>
              <div className="mt-3 min-h-11" aria-live="polite" aria-atomic="true">
                {marketOptionsState === 'loading' && (
                  <p role="status" className="text-body-sm text-on-surface-variant">
                    市場清單載入中…
                  </p>
                )}
                {marketOptionsState === 'error' && (
                  <div role="alert" className="flex flex-wrap items-center gap-3 text-body-sm text-error">
                    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.1rem' }}>error</span>
                    <span>市場清單暫時無法載入，請確認網路後重試。</span>
                    <button
                      type="button"
                      onClick={handleRetryMarketOptions}
                      className="touch-target rounded-xl px-3 py-1 font-semibold text-error underline-offset-2 hover:bg-error/8 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30"
                    >
                      重試
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="market-status-chip">{selectedType === 'Veg' ? '蔬菜市場' : '水果市場'}</span>
              <span className="market-status-chip">{selectedCounty}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-body-sm text-on-surface-variant font-medium">市場類別</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'Veg', label: '蔬菜', note: '日常買菜主線' },
                  { value: 'Fruit', label: '水果', note: '水果批發脈絡' },
                ] as const).map((typeOption) => (
                    <button
                      key={typeOption.value}
                      type="button"
                      aria-pressed={selectedType === typeOption.value}
                      disabled={marketOptionsState !== 'ready'}
                      onClick={() => handleTypeChange(typeOption.value)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/70 disabled:cursor-not-allowed disabled:opacity-60 ${
                        selectedType === typeOption.value
                          ? 'border-primary/30 bg-primary/8 text-primary dark:bg-primary-container dark:text-on-primary-container shadow-sm'
                          : 'border-outline-variant/35 bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span className="block text-body-md font-semibold">{typeOption.label}</span>
                      <span className="block text-body-sm mt-1 opacity-80">{typeOption.note}</span>
                    </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="county-filter" className="text-body-sm text-on-surface-variant block font-medium">
                  縣市地區
                </label>
                <select
                  suppressHydrationWarning
                  id="county-filter"
                  value={selectedCounty}
                  disabled={marketOptionsState !== 'ready'}
                  onChange={(e) => handleCountyChange(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl px-4 py-3 text-body-md text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/70"
                >
                  <option value="全部地區">全部地區</option>
                  {countiesForType.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="preferred-market" className="text-body-sm text-on-surface-variant block font-medium">
                  指定市場
                </label>
                <select
                  suppressHydrationWarning
                  id="preferred-market"
                  value={preferences.preferredMarket}
                  disabled={marketOptionsState !== 'ready'}
                  onChange={(event) => {
                    triggerHaptic(hapticPatterns.tick)
                    persist({ preferredMarket: event.target.value })
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-2xl px-4 py-3 text-body-md text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/70"
                >
                  {marketOptionsState !== 'ready' ? (
                    <option value={preferences.preferredMarket} disabled>
                      {marketOptionsState === 'loading' ? '市場清單載入中…' : '市場清單暫時無法使用'}
                    </option>
                  ) : filteredMarkets.length > 0 ? (
                    filteredMarkets.map((market) => (
                      <option key={market} value={market}>{market}</option>
                    ))
                  ) : (
                    <option disabled value="">此地區無可用市場</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell" aria-labelledby="danger-zone-heading">
          <p className="section-kicker text-error">Danger zone</p>
          <h2 id="danger-zone-heading" className="text-headline-md font-semibold text-on-surface mt-1">重設偏好</h2>
          <p className="text-body-sm text-on-surface-variant mt-1 max-w-2xl">
            只會清除本機的字級、主題、市場、通知與靜音設定；收藏清單不受影響，瀏覽器通知權限也不會被撤銷。
          </p>
          <div className="mt-4 rounded-2xl border border-error/25 bg-error/8 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-body-sm text-on-surface">重設後會立即套用預設值，這個動作無法復原。</p>
              <button
                ref={resetTriggerButtonRef}
                type="button"
                aria-expanded={resetConfirmationOpen}
                aria-controls="reset-confirmation"
                onClick={() => setResetConfirmationOpen(true)}
                className="touch-target shrink-0 rounded-xl border border-error/35 px-3 py-2 text-body-sm font-semibold text-error hover:bg-error/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30"
              >
                重設所有偏好
              </button>
            </div>

            {resetConfirmationOpen && (
              <div
                id="reset-confirmation"
                role="dialog"
                aria-modal="false"
                aria-labelledby="reset-confirmation-heading"
                aria-describedby="reset-confirmation-description"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    setResetConfirmationOpen(false)
                    resetTriggerButtonRef.current?.focus()
                  }
                }}
                className="mt-4 rounded-xl border border-error/30 bg-surface-container px-4 py-4"
              >
                <h3 id="reset-confirmation-heading" className="text-body-md font-semibold text-on-surface">確認重設所有偏好？</h3>
                <p id="reset-confirmation-description" className="text-body-sm text-on-surface-variant mt-1">
                  字級、主題、預設市場、通知設定與靜音狀態會恢復預設；收藏清單和瀏覽器權限不會改變。
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetConfirmationOpen(false)
                      resetTriggerButtonRef.current?.focus()
                    }}
                    className="touch-target rounded-xl px-3 py-2 text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/70"
                  >
                    先不要
                  </button>
                  <button
                    ref={resetConfirmButtonRef}
                    type="button"
                    onClick={handleResetPreferences}
                    className="touch-target rounded-xl bg-error px-3 py-2 text-body-sm font-semibold text-white hover:bg-error/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30"
                  >
                    確認重設
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="section-shell">
            <p className="section-kicker">Locale</p>
            <h2 className="text-headline-md font-semibold text-on-surface mt-1">目前語言與地區</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">目前僅支援繁體中文（台灣），之後可在這裡加入其他語言。</p>
            <div className="mt-4 rounded-3xl border border-outline-variant/35 bg-surface-container-low px-4 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="material-symbols-outlined text-primary" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
                  language
                </span>
                <div className="min-w-0">
                  <p className="text-body-lg text-on-surface font-semibold">Traditional Chinese (Taiwan)</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">使用台灣市場詞彙與閱讀習慣</p>
                </div>
              </div>
              <span className="text-body-sm text-on-surface font-medium">{preferences.locale}</span>
            </div>
          </div>

          <div className="section-shell">
            <p className="section-kicker">About</p>
            <h2 className="text-headline-md font-semibold text-on-surface mt-1">關於系統</h2>
            <Link href="/privacy" className="mt-3 inline-flex min-h-11 items-center text-primary underline underline-offset-4">
              隱私與合作揭露
            </Link>
            <div className="mt-4 space-y-3 text-body-md text-on-surface-variant">
              <div className="rounded-3xl border border-outline-variant/35 bg-surface-container-low px-4 py-3 flex justify-between gap-4">
                <span>版本</span>
                <span className="text-on-surface font-medium">1.0.0</span>
              </div>
              <div className="rounded-3xl border border-outline-variant/35 bg-surface-container-low px-4 py-3 flex justify-between gap-4">
                <span>資料來源</span>
                <span className="text-on-surface font-medium">農業部 (MOA)</span>
              </div>
              <div className="rounded-3xl border border-outline-variant/35 bg-surface-container-low px-4 py-3 flex justify-between gap-4">
                <span>更新頻率</span>
                <span className="text-on-surface font-medium">每日更新</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
