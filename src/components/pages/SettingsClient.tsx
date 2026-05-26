'use client'

import { useEffect, useState, useMemo } from 'react'
import { fetchMarketOptions } from '@/lib/api'
import { resolveCountyFromMarketName } from '@/lib/server/marketCountyMap'
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
  const [marketsByType, setMarketsByType] = useState<Record<string, string[]>>({})
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

    fetchMarketOptions().then((meta) => {
      setMarketsByType(meta.marketsByType)
    }).catch(console.error)

    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const marketsForType = marketsByType[selectedType] ?? []

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

  const themeLabel = preferences.theme === 'light' ? '淺色' : preferences.theme === 'dark' ? '深色' : '自動'
  const fontSizeLabel = preferences.fontSize === 'small' ? '小' : preferences.fontSize === 'medium' ? '中' : '大'
  const summaryCards = [
    {
      label: '外觀模式',
      value: themeLabel,
      meta: preferences.theme === 'auto' ? '跟隨系統色彩' : '立即套用目前主題',
    },
    {
      label: '文字尺寸',
      value: `${fontSizeLabel}字級`,
      meta: '已同步整個 app 的閱讀密度',
    },
    {
      label: '預設市場',
      value: preferences.preferredMarket,
      meta: selectedType === 'Veg' ? '蔬菜市場' : '水果市場',
    },
  ]

  const settingsNotes = [
    {
      label: '通知狀態',
      value: preferences.priceAlert ? '價格警示開啟' : '價格警示關閉',
      meta: notificationPermission === 'granted'
        ? '瀏覽器權限已允許'
        : notificationPermission === 'denied'
          ? '瀏覽器權限已拒絕'
          : '尚未決定是否允許',
    },
    {
      label: '每日摘要',
      value: preferences.dailySummary ? '首頁顯示中' : '目前未顯示',
      meta: '決定首頁是否出現每日行情摘要條',
    },
    {
      label: '使用地區',
      value: preferences.locale,
      meta: '目前固定使用繁中與台灣市場詞彙',
    },
  ]

  return (
    <div className="home-dashboard-shell pb-8">
      <div className="px-section-margin py-4 md:py-6 space-y-section-margin">
        <section className="home-market-stage -mx-3 md:-mx-6 px-3 md:px-6 py-2 md:py-3">
          <div className="market-signal-tape mb-4" aria-hidden="true">
            <span>PREFERENCES DESK</span>
            <span>READING COMFORT</span>
            <span>MARKET DEFAULTS</span>
            <span>MOBILE CONTROL</span>
          </div>

          <div className="section-heading-row mb-4">
            <div>
              <p className="section-kicker">Preferences desk</p>
              <h1 className="text-headline-lg font-black text-on-surface">系統設定</h1>
              <p className="text-body-sm text-on-surface-variant mt-1 max-w-2xl">
                這裡把閱讀密度、提醒方式和預設市場收進同一個設定桌面，手機上也能快速切換，不用來回找選項。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="market-status-chip">{themeLabel}</span>
              <span className="market-status-chip">{fontSizeLabel}字級</span>
              <span className={`market-status-chip ${preferences.priceAlert ? '' : 'market-status-chip--warm'}`}>
                {preferences.priceAlert ? '價格警示啟用' : '價格警示關閉'}
              </span>
            </div>
          </div>

          <div className="home-hero-card rounded-3xl overflow-hidden">
            <div className="px-5 sm:px-6 pt-6 pb-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_18rem]">
              <div className="min-w-0 space-y-5">
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="market-status-chip market-status-chip--hero">Preference sync</span>
                    <span className="market-status-chip market-status-chip--hero">Mobile ready</span>
                    <span className="market-status-chip market-status-chip--hero">Daily workflow</span>
                  </div>
                  <p className="text-[0.6875rem] tracking-[0.16em] uppercase font-semibold mb-2 text-white/48">
                    目前使用組態
                  </p>
                  <div className="flex items-end gap-3 flex-wrap">
                    <span className="text-[2.5rem] sm:text-[3.2rem] leading-none font-black tabular-nums tracking-tight text-[#fcd34d]">
                      {preferences.preferredMarket}
                    </span>
                  </div>
                  <p className="mt-3 text-body-sm text-white/70 max-w-xl">
                    設定會即時套用到整個 app。字級先照顧手機閱讀，市場偏好則幫你把首頁與搜尋頁預設到常看的脈絡。
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {summaryCards.map((card) => (
                    <div key={card.label} className="market-pulse-chip market-pulse-chip--hero">
                      <span>{card.label}</span>
                      <strong>{card.value}</strong>
                      <small>{card.meta}</small>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hero-info-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="section-kicker text-white/65">System notes</p>
                    <h2 className="text-body-lg font-bold text-white">設定摘要</h2>
                  </div>
                  <span className="material-symbols-outlined text-white/55" style={{ fontSize: '1.25rem' }}>
                    tune
                  </span>
                </div>

                <div className="hero-insight-list mt-4">
                  {settingsNotes.map((note) => (
                    <div key={note.label} className="hero-insight-item">
                      <div className="hero-inline-stat">
                        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-white/48">
                          {note.label}
                        </span>
                      </div>
                      <p className="mt-2 text-body-sm font-semibold text-white">{note.value}</p>
                      <p className="mt-1 text-body-sm text-white/70 leading-relaxed">{note.meta}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="section-shell">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => persist({ fontSize: size })}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors touch-target ${
                        preferences.fontSize === size
                          ? 'border-primary/30 bg-primary/8 text-primary shadow-sm'
                          : 'border-outline-variant/35 bg-white/45 text-on-surface hover:bg-white/70'
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    { value: 'light', icon: 'light_mode', label: '淺色', note: '白天閱讀較輕快' },
                    { value: 'dark', icon: 'dark_mode', label: '深色', note: '夜間更柔和' },
                    { value: 'auto', icon: 'brightness_auto', label: '自動', note: '跟著系統切換' },
                  ] as Array<{ value: Theme; icon: string; label: string; note: string }>).map((themeOption) => (
                    <button
                      key={themeOption.value}
                      onClick={() => persist({ theme: themeOption.value })}
                      className={`rounded-2xl border px-4 py-4 transition-colors touch-target flex items-start gap-3 text-left ${
                        preferences.theme === themeOption.value
                          ? 'border-primary/30 bg-primary/8 text-primary shadow-sm'
                          : 'border-outline-variant/35 bg-white/45 text-on-surface hover:bg-white/70'
                      }`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.4rem' }}>{themeOption.icon}</span>
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

          <div id="notifications" className="section-shell scroll-mt-24">
            <div className="mb-5">
              <p className="section-kicker">Notification flow</p>
              <h2 className="text-headline-md font-semibold text-on-surface">通知設定</h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                把提醒維持在有用但不吵的節奏，手機端也保留一眼就懂的開關狀態。
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: '價格異常警告',
                  sub: '有明顯波動時提醒我',
                  state: preferences.priceAlert,
                  toggle: handlePriceAlertToggle,
                  detail: `瀏覽器權限：${notificationPermission === 'granted' ? '已允許' : notificationPermission === 'denied' ? '已拒絕' : '尚未決定'}`,
                },
                {
                  label: '每日行情彙整',
                  sub: '首頁顯示每日摘要條',
                  state: preferences.dailySummary,
                  toggle: () => persist({ dailySummary: !preferences.dailySummary }),
                  detail: preferences.dailySummary ? '打開首頁就能先看到總覽' : '首頁保持更乾淨的第一屏',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/55 bg-white/45 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-body-lg text-on-surface font-semibold">{item.label}</p>
                      <p className="text-body-sm text-on-surface-variant mt-1">{item.sub}</p>
                    </div>
                    <button
                      onClick={() => item.toggle()}
                      aria-pressed={item.state}
                      className={`w-14 h-8 rounded-full relative transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        item.state ? 'bg-primary' : 'bg-surface-variant'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 ${
                          item.state ? 'left-[1.55rem]' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mt-3">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-shell">
          <div className="section-heading-row mb-5">
            <div>
              <p className="section-kicker">Market defaults</p>
              <h2 className="text-headline-md font-semibold text-on-surface">預設市場</h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                首頁、搜尋和後續操作會優先帶入這裡的市場偏好。
              </p>
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
                    onClick={() => handleTypeChange(typeOption.value)}
                    className={`rounded-2xl border px-4 py-3 text-left transition-colors touch-target ${
                      selectedType === typeOption.value
                        ? 'border-primary/30 bg-primary/8 text-primary shadow-sm'
                        : 'border-outline-variant/35 bg-white/45 text-on-surface hover:bg-white/70'
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
                  onChange={(e) => handleCountyChange(e.target.value)}
                  className="w-full bg-white/70 border border-outline-variant/40 rounded-2xl px-4 py-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                  onChange={(event) => persist({ preferredMarket: event.target.value })}
                  className="w-full bg-white/70 border border-outline-variant/40 rounded-2xl px-4 py-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {filteredMarkets.length > 0 ? (
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

        <section className="grid gap-4 md:grid-cols-2">
          <div className="section-shell">
            <p className="section-kicker">Locale</p>
            <h2 className="text-headline-md font-semibold text-on-surface mt-1">語言與地區</h2>
            <div className="mt-4 rounded-3xl border border-white/55 bg-white/45 px-4 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
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
            <div className="mt-4 space-y-3 text-body-md text-on-surface-variant">
              <div className="rounded-3xl border border-white/55 bg-white/45 px-4 py-3 flex justify-between gap-4">
                <span>版本</span>
                <span className="text-on-surface font-medium">1.0.0</span>
              </div>
              <div className="rounded-3xl border border-white/55 bg-white/45 px-4 py-3 flex justify-between gap-4">
                <span>資料來源</span>
                <span className="text-on-surface font-medium">農業部 (MOA)</span>
              </div>
              <div className="rounded-3xl border border-white/55 bg-white/45 px-4 py-3 flex justify-between gap-4">
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
