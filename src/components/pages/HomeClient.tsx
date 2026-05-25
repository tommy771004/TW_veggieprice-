'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { TrendChip } from '@/components/ui/TrendChip'
import { SkeletonCard, SkeletonList } from '@/components/ui/SkeletonCard'
import { ExploreSection } from '@/components/ui/ExploreSection'
import { AboutSection } from '@/components/ui/AboutSection'
import { RecommendedLinks } from '@/components/ui/RecommendedLinks'
import { DataSourceBadge } from '@/components/ui/DataSourceBadge'
import { formatPrice, cleanErrorMessage } from '@/lib/utils'
import { DEFAULT_MARKET, DEFAULT_HOME_MARKETS } from '@/lib/constants'
import { WeatherRiskCard } from '@/components/ui/WeatherRiskCard'
import { getProduceCategory, getSeasonalGuide, type ProduceCategory } from '@/lib/produce'
import type {
  MarketOverview,
  PriceHistoryPoint,
  TopMover,
  LivestockPrices,
  SeasonalItem,
  MarketRestDay,
  MarketWeatherRiskSummary,
} from '@/lib/types'
import {
  fetchMarketList,
  fetchTopMovers,
  fetchLivestock,
  fetchSeasonal,
  fetchMarketRestDays,
  fetchMarketWeatherRisk,
} from '@/lib/api'
import { getUserPreferences, DEFAULT_USER_PREFERENCES } from '@/lib/preferences'

const CATEGORIES: ReadonlyArray<{ label: string; value: ProduceCategory }> = [
  { label: '🥬 蔬菜類', value: 'vegetable' },
  { label: '🍎 水果類', value: 'fruit' },
  { label: '🌸 花卉類', value: 'flower' },
  { label: '🍄 菇類', value: 'mushroom' },
]

// ── Shared animation variants ──────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 28 },
  },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
}

const moverVariant = {
  hidden: { opacity: 0, x: -12, scale: 0.97 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 340, damping: 26 },
  },
}

const cardVariant = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

export function HomeClient() {
  const [overview, setOverview] = useState<MarketOverview | null>(null)
  const [movers, setMovers] = useState<TopMover[]>([])
  const [marketTrend, setMarketTrend] = useState<PriceHistoryPoint[]>([])
  const [markets, setMarkets] = useState<string[]>(DEFAULT_HOME_MARKETS)
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingMovers, setLoadingMovers] = useState(true)
  const [activeCategory, setActiveCategory] = useState<ProduceCategory>('vegetable')
  const [selectedMarket, setSelectedMarket] = useState(DEFAULT_MARKET)
  const [overviewError, setOverviewError] = useState('')
  const [moversError, setMoversError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [summaryDismissed, setSummaryDismissed] = useState(false)
  const [livestock, setLivestock] = useState<LivestockPrices | null>(null)
  const [loadingLivestock, setLoadingLivestock] = useState(true)
  const [seasonalGuide, setSeasonalGuide] = useState<SeasonalItem[]>([])
  const [loadingSeasonal, setLoadingSeasonal] = useState(true)
  const [nextRestDay, setNextRestDay] = useState<MarketRestDay | null>(null)
  const [isClosedToday, setIsClosedToday] = useState(false)
  const [weatherRisk, setWeatherRisk] = useState<MarketWeatherRiskSummary | null>(null)
  const [preferences, setPreferences] = useState(DEFAULT_USER_PREFERENCES)
  const [alertDismissed, setAlertDismissed] = useState(false)

  const loading = loadingMovers

  useEffect(() => {
    setAlertDismissed(false)
  }, [selectedMarket])

  useEffect(() => {
    const prefs = getUserPreferences()
    setPreferences(prefs)
    
    const marketType = prefs.preferredMarketType ?? 'Veg'
    const marketName = prefs.preferredMarket ?? DEFAULT_MARKET
    
    setSelectedMarket(marketName)

    fetchMarketList(marketType).then((list) => {
      setMarkets(list.filter((m) => m !== '全部市場'))
    }).catch(console.error)
  }, [])

  useEffect(() => {
    setLoadingMovers(true)
    setMoversError('')
    fetchTopMovers()
      .then(setMovers)
      .catch((err) => setMoversError(err instanceof Error ? err.message : '暫時無法取得波動排行'))
      .finally(() => setLoadingMovers(false))
  }, [])

  useEffect(() => {
    fetchLivestock()
      .then(setLivestock)
      .catch(() => setLivestock(null))
      .finally(() => setLoadingLivestock(false))
  }, [])

  useEffect(() => {
    fetchSeasonal()
      .then((data) => setSeasonalGuide(data.length > 0 ? data : getSeasonalGuide()))
      .catch(() => setSeasonalGuide(getSeasonalGuide()))
      .finally(() => setLoadingSeasonal(false))
  }, [])

  useEffect(() => {
    function addDaysISO(iso: string, days: number) {
      const date = new Date(`${iso}T00:00:00`)
      date.setDate(date.getDate() + days)
      return date.toISOString().split('T')[0]
    }

    async function loadOverviewAndTrend() {
      setLoadingOverview(true)
      setOverviewError('')

      const today = new Date().toISOString().split('T')[0]
      const [ovResult, trendResult, restResult, weatherResult] = await Promise.allSettled([
        fetch(`/api/prices/overview?market=${encodeURIComponent(selectedMarket)}`)
          .then((r) => r.json().then((j: unknown) => ({ ok: r.ok, json: j }))),
        fetch(`/api/prices/overview/trend?market=${encodeURIComponent(selectedMarket)}&days=7`)
          .then((r) => r.json().then((j: unknown) => ({ ok: r.ok, json: j }))),
        fetchMarketRestDays({
          market: selectedMarket,
          startDate: today,
          endDate: addDaysISO(today, 45),
        }),
        fetchMarketWeatherRisk(selectedMarket),
      ])

      if (ovResult.status === 'fulfilled' && ovResult.value.ok) {
        setOverview(ovResult.value.json as MarketOverview)
      } else {
        const json = ovResult.status === 'fulfilled' ? (ovResult.value.json as { error?: string }) : null
        setOverviewError(json?.error || '暫時無法取得市場概況')
      }

      if (trendResult.status === 'fulfilled' && trendResult.value.ok) {
        setMarketTrend(trendResult.value.json as PriceHistoryPoint[])
      } else {
        setMarketTrend([])
      }

      if (restResult.status === 'fulfilled') {
        const next = restResult.value
          .filter((item) => item.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
        setNextRestDay(next)
        setIsClosedToday(next?.date === today)
      } else {
        setNextRestDay(null)
        setIsClosedToday(false)
      }

      if (weatherResult.status === 'fulfilled') {
        setWeatherRisk(weatherResult.value)
      } else {
        setWeatherRisk(null)
      }

      setLoadingOverview(false)
    }
    loadOverviewAndTrend()
  }, [selectedMarket, reloadKey])

  const filteredMovers = movers.filter((item) => getProduceCategory(item.cropName) === activeCategory)
  const trendSeries = marketTrend
  const trendPoints = trendSeries.filter((point) => point.avgPrice !== null)
  let maxTrend = 1
  let minTrend = Infinity
  for (const p of trendPoints) {
    const v = p.avgPrice ?? 0
    if (v > maxTrend) maxTrend = v
    if (v < minTrend) minTrend = v
  }
  if (minTrend === Infinity) minTrend = maxTrend
  const trendRange = Math.max(maxTrend - minTrend, 1)
  const trendChange = trendPoints.length > 1
    ? (((trendPoints[trendPoints.length - 1].avgPrice ?? 0) - (trendPoints[0].avgPrice ?? 0)) / Math.max(trendPoints[0].avgPrice ?? 1, 1)) * 100
    : 0

  const heroLinePoints = trendPoints.length > 1
    ? trendPoints.map((p, i) => {
        const v = p.avgPrice ?? 0
        const x = (i / (trendPoints.length - 1)) * 400
        const y = 40 - ((v - minTrend) / trendRange) * 32 - 4
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    : ''

  const showErrorCard = !loadingOverview && !loadingMovers && overviewError !== '' && moversError !== ''
  const combinedError = overviewError || moversError
  const sparkColor = trendChange >= 0 ? '#fcd34d' : '#86efac'
  const weatherMarkerTone = weatherRisk?.level === 'high'
    ? 'bg-error text-white'
    : weatherRisk?.level === 'medium'
      ? 'bg-amber-500 text-white'
      : 'bg-primary text-white'

  return (
    <div className="px-section-margin py-6 space-y-section-margin">

      {/* ── Market Overview Hero ───────────────────────── */}
      <motion.section variants={fadeUp} initial="hidden" animate="show">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-headline-md font-bold text-on-surface">今日市場概況</h2>
            {overview?.updatedAt && (
              <p className="text-label-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>update</span>
                最後更新：{new Date(overview.updatedAt).toLocaleString('zh-TW', {
                  month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            )}
          </div>
          <select
            suppressHydrationWarning
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="bg-white/60 border border-outline-variant/40 rounded-full px-3 py-1.5 text-label-bold text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 backdrop-blur-sm"
          >
            {markets.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {(nextRestDay || weatherRisk) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <div className="rounded-2xl border border-primary/20 bg-white/70 backdrop-blur-sm px-4 py-3">
              <p className="text-label-bold text-primary">市場休市避雷</p>
              {nextRestDay ? (
                <p className="text-body-sm text-on-surface mt-1">
                  下次休市：{nextRestDay.date.replace(/-/g, '/')} {nextRestDay.note ? `(${nextRestDay.note})` : ''}
                </p>
              ) : (
                <p className="text-body-sm text-on-surface-variant mt-1">近 45 日暫無休市公告</p>
              )}
            </div>
            <WeatherRiskCard weatherRisk={weatherRisk} />
          </div>
        )}

        {/* Daily summary banner */}
        <AnimatePresence>
          {!summaryDismissed && preferences.dailySummary && overview && !loadingOverview && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="bg-primary/8 border border-primary/20 rounded-2xl px-4 py-3 flex items-center justify-between text-body-sm text-on-surface">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '1.125rem' }}>analytics</span>
                  {overview.marketName} 今日均價 ${formatPrice(overview.avgPrice)}，較昨日&nbsp;
                  <TrendChip change={overview.priceChange} size="sm" />
                  ，總交易量 {(overview.totalVolume / 1000).toFixed(0)} 公噸
                </span>
                <button
                  aria-label="關閉摘要"
                  onClick={() => setSummaryDismissed(true)}
                  className="ml-3 text-outline hover:text-on-surface leading-none flex-shrink-0"
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {loadingOverview ? (
            <motion.div
              key="hero-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="home-hero-card rounded-3xl p-6 animate-pulse"
            >
              <div className="h-3 w-28 rounded-full mb-5" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="h-14 w-44 rounded-xl mb-6" style={{ background: 'rgba(255,255,255,0.12)' }} />
              <div className="h-9 w-full rounded-lg" style={{ background: 'rgba(255,255,255,0.07)' }} />
            </motion.div>
          ) : showErrorCard ? (
            <motion.div key="hero-error" variants={fadeUp} initial="hidden" animate="show">
              <GlassCard className="p-container-padding text-center">
                <div className="text-4xl mb-2">🧺</div>
                <p className="text-body-lg font-semibold text-on-surface">首頁資料暫時無法載入</p>
                <p className="text-body-sm text-on-surface-variant mt-1">{combinedError}</p>
                <button
                  onClick={() => setReloadKey((v) => v + 1)}
                  className="mt-4 text-primary text-label-bold hover:underline"
                >
                  重新載入
                </button>
              </GlassCard>
            </motion.div>
          ) : overviewError ? (
            <motion.div key="hero-ov-error" variants={fadeUp} initial="hidden" animate="show">
              <GlassCard className="p-container-padding text-center">
                <div className="text-4xl mb-2">🧺</div>
                <p className="text-body-lg font-semibold text-on-surface">市場概況暫時無法載入</p>
                <p className="text-body-sm text-on-surface-variant mt-1">{overviewError}</p>
                <button
                  onClick={() => setReloadKey((v) => v + 1)}
                  className="mt-4 text-primary text-label-bold hover:underline"
                >
                  重新載入
                </button>
              </GlassCard>
            </motion.div>
          ) : overview ? (
            <motion.div
              key="hero-data"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            >
              <Link
                href={`/search?market=${encodeURIComponent(selectedMarket)}&type=${
                  activeCategory === 'fruit' ? 'Fruit' : activeCategory === 'flower' ? 'Flower' : 'Veg'
                }`}
                className="block home-hero-card rounded-3xl overflow-hidden card-lift"
              >
                <div className={`px-6 pt-6 pb-4 relative ${isClosedToday ? 'opacity-60 grayscale transition-all' : ''}`}>
                  {isClosedToday && (
                    <div className="absolute top-4 right-6 bg-surface-variant/90 text-on-surface-variant px-2 py-1 rounded text-xs font-bold ring-1 ring-outline/20 backdrop-blur-md flex items-center gap-1 z-10 shadow-sm">
                      <span className="material-symbols-outlined text-[14px]">event_busy</span>
                      本日休市
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p
                        className="text-[0.6875rem] tracking-[0.16em] uppercase font-semibold mb-2"
                        style={{ color: 'rgba(255,255,255,0.38)' }}
                      >
                        均價 · 元 / 公斤
                      </p>
                      <div className="flex items-end gap-3 flex-wrap">
                        <motion.span
                          className="text-[3.25rem] leading-none font-black tabular-nums tracking-tight"
                          style={{ color: '#fcd34d' }}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                        >
                          ${formatPrice(overview.avgPrice)}
                        </motion.span>
                        <div className="pb-1.5 shrink-0">
                          <TrendChip change={overview.priceChange} />
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 mt-1">
                      <p className="text-[0.6875rem] tracking-[0.12em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.38)' }}>
                        交易量
                      </p>
                      <p className="text-xl font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        {(overview.totalVolume / 1000).toFixed(0)}
                        <span className="text-sm font-normal ml-0.5" style={{ color: 'rgba(255,255,255,0.42)' }}>公噸</span>
                      </p>
                      <div className="mt-1">
                        <TrendChip change={overview.volumeChange} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>

                {trendPoints.length > 1 && (
                  <div className={`px-5 pb-5 ${isClosedToday ? 'opacity-60 grayscale transition-all' : ''}`}>
                    <svg viewBox="0 0 400 44" className="w-full h-11" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={sparkColor} stopOpacity="0.22" />
                          <stop offset="100%" stopColor={sparkColor} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon points={`0,44 ${heroLinePoints} 400,44`} fill="url(#hero-area)" />
                      <polyline
                        points={heroLinePoints}
                        fill="none"
                        stroke={sparkColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.8"
                      />
                    </svg>
                    <div className="flex justify-between px-0.5" style={{ marginTop: '2px' }}>
                      <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.28)' }}>
                        {trendPoints[0]?.date.slice(5).replace('-', '/')}
                      </span>
                      <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>
                        近 {trendSeries.length || trendPoints.length} 日走勢
                      </span>
                      <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.28)' }}>
                        {trendPoints[trendPoints.length - 1]?.date.slice(5).replace('-', '/')}
                      </span>
                    </div>
                  </div>
                )}
              </Link>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.section>

      {/* ── Other Projects ────────────────────────────── */}
      <RecommendedLinks />

      {/* ── Category Filter ───────────────────────────── */}
      <section className="-mx-section-margin px-section-margin overflow-x-auto hide-scrollbar">
        <div className="flex gap-2 w-max pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-5 py-2.5 rounded-full text-label-bold whitespace-nowrap flex items-center gap-2 transition-all duration-200 touch-target ${
                activeCategory === cat.value
                  ? 'bg-primary text-white shadow-md scale-[1.03]'
                  : 'glass-chip text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Top Movers ────────────────────────────────── */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-headline-md font-bold text-on-surface">價格波動榜</h2>
          <Link
            href={`/search?market=${encodeURIComponent(selectedMarket)}&type=${
              activeCategory === 'fruit' ? 'Fruit' : activeCategory === 'flower' ? 'Flower' : 'Veg'
            }`}
            className="text-primary text-label-bold hover:underline flex items-center gap-0.5"
          >
            查看全部
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>chevron_right</span>
          </Link>
        </div>

        {loading ? (
          <SkeletonList count={5} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              {filteredMovers.length > 0 ? filteredMovers.map((item, i) => (
                <motion.div key={item.cropCode} variants={moverVariant}>
                  <Link
                    href={`/produce/${encodeURIComponent(item.cropName)}`}
                    className="glass-card card-lift rounded-2xl flex items-center justify-between p-3.5 hover:bg-white/60 transition-colors touch-target block"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-xl bg-white/60 border border-white/50 flex items-center justify-center text-2xl shadow-sm">
                          {item.emoji}
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary-container text-white text-[0.625rem] font-black rounded-full flex items-center justify-center leading-none shadow-sm">
                          {i + 1}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-body-lg font-semibold text-on-surface truncate">{item.cropName}</h3>
                        <p className="text-body-sm text-on-surface-variant truncate">
                          {item.marketName}<span className="opacity-40 mx-1">·</span>{item.grade}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-headline-md font-black text-on-surface tabular-nums">${formatPrice(item.currentPrice)}</div>
                      <div className="mt-1">
                        <TrendChip change={item.priceChange} size="sm" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )) : (
                <motion.div variants={fadeUp} className="md:col-span-2 lg:col-span-3">
                  <GlassCard className="p-container-padding text-center">
                    <p className="text-body-md text-on-surface">目前沒有符合此分類的波動作物</p>
                    <p className="text-body-sm text-on-surface-variant mt-1">請切換其他分類查看</p>
                  </GlassCard>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </section>

      {/* ── Livestock Prices ──────────────────────────── */}
      <section>
        <h2 className="text-headline-md font-bold text-on-surface mb-4">民生物資行情</h2>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-30px' }}
        >
          {loadingLivestock ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <motion.div variants={cardVariant}>
                <GlassCard className="p-container-padding h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🥚</span>
                    <span className="text-body-sm text-on-surface-variant">雞蛋大運輸價（元/台斤）</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-headline-lg font-bold text-on-surface tabular-nums">
                      {livestock?.eggPrice != null ? `$${livestock.eggPrice.toFixed(1)}` : '—'}
                    </span>
                    {livestock?.eggPriceChange != null && (
                      <TrendChip change={livestock.eggPriceChange} size="sm" />
                    )}
                  </div>
                  {livestock?.eggProducerPrice != null && (
                    <p className="text-body-sm text-on-surface-variant mt-1">
                      產地價 ${livestock.eggProducerPrice.toFixed(1)} / 台斤
                    </p>
                  )}
                </GlassCard>
              </motion.div>

              <motion.div variants={cardVariant}>
                <GlassCard className="p-container-padding h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🐷</span>
                    <span className="text-body-sm text-on-surface-variant">毛豬全國加權均價（元/公斤）</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-headline-lg font-bold text-on-surface tabular-nums">
                      {livestock?.porkAvgPrice != null ? `$${livestock.porkAvgPrice.toFixed(1)}` : '—'}
                    </span>
                    {livestock?.porkPriceChange != null && (
                      <TrendChip change={livestock.porkPriceChange} size="sm" />
                    )}
                  </div>
                  {livestock?.date && (
                    <p className="text-body-sm text-on-surface-variant mt-1">
                      資料日期：{new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium' }).format(new Date(livestock.date))}
                    </p>
                  )}
                </GlassCard>
              </motion.div>
            </>
          )}
        </motion.div>
      </section>

      {/* ── Weekly Trend + Seasonal Guide ─────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-30px' }}
        >
          <GlassCard className="p-container-padding flex flex-col justify-between min-h-[160px] h-full">
            <div>
              <h3 className="text-body-lg font-semibold text-on-surface">本週蔬菜均價走勢</h3>
              <p className="text-body-sm text-on-surface-variant mt-1">
                {selectedMarket} 近 {trendSeries.length} 日&nbsp;
                <span className={trendChange >= 0 ? 'text-error' : 'text-primary'}>
                  {trendChange >= 0 ? '▲' : '▼'} {Math.abs(trendChange).toFixed(1)}%
                </span>
              </p>
            </div>
            {trendSeries.length > 0 ? (
              <div className="h-20 flex items-end justify-between gap-1.5 mt-4">
                {trendSeries.map((point, i) => {
                  const isClosedDay = point.avgPrice === null
                  const currentValue = point.avgPrice ?? minTrend
                  const height = isClosedDay ? 22 : 24 + (((currentValue - minTrend) / trendRange) * 76)
                  return (
                    <div
                      key={point.date}
                      className={`w-full relative overflow-visible ${isClosedDay ? 'border-t border-dashed border-outline/70' : 'rounded-t-md'}`}
                      style={{
                        height: `${height}%`,
                        backgroundColor: isClosedDay
                          ? 'transparent'
                          : `rgba(46, 125, 50, ${0.35 + (height / 100) * 0.35})`,
                      }}
                    >
                      {isClosedDay && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-surface-container text-outline text-[0.625rem] font-semibold px-1.5 py-0.5 rounded border border-outline-variant/40 whitespace-nowrap">
                          休
                        </span>
                      )}
                      {i === trendSeries.length - 1 && (
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-primary text-[0.625rem] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                          今日
                        </span>
                      )}
                      {i === trendSeries.length - 1 && weatherRisk && (
                        <span className={`absolute -top-12 left-1/2 -translate-x-1/2 text-[0.625rem] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap ${weatherMarkerTone}`}>
                          風險 {weatherRisk.score}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center text-body-sm text-on-surface-variant mt-4">
                近 7 日暫無足夠趨勢資料
              </div>
            )}
          </GlassCard>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-30px' }}
        >
          <div className="mt-8 mb-4">
            <div className="flex items-center gap-2 mb-4 px-2">
              <span className="material-symbols-outlined text-primary">local_florist</span>
              <h3 className="text-headline-md font-semibold text-on-surface">當季盛產指南</h3>
            </div>
            <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-3 pb-4 -mx-4 px-4 md:mx-0 md:px-0">
              {loadingSeasonal ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="shrink-0 w-44 rounded-3xl bg-white/50 animate-pulse h-32 snap-start border border-white/20" />
                ))
              ) : seasonalGuide.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant text-center py-4 w-full">暫無本月盛產資料</p>
              ) : (
                seasonalGuide.map((item, i) => (
                  <motion.div
                    key={item.cropName}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <Link
                      href={`/search?q=${encodeURIComponent(item.cropName)}&type=${
                        item.category === 'fruit' ? 'Fruit' : item.category === 'flower' ? 'Flower' : 'Veg'
                      }`}
                      className="shrink-0 w-48 rounded-3xl glass-card p-4 hover:bg-white transition-all shadow-glass-sm hover:shadow-glass flex flex-col snap-start border border-white/40 group card-lift block"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-3xl leading-none transition-transform group-hover:scale-110">{item.emoji}</span>
                        <span className="material-symbols-outlined text-primary/40 text-[18px] group-hover:text-primary transition-colors">arrow_forward</span>
                      </div>
                      <h3 className="text-body-lg font-bold text-on-surface mb-1 truncate">{item.cropName}</h3>
                      <p className="text-label-sm text-primary line-clamp-2 leading-relaxed">{item.reason}</p>
                      {item.note && (
                        <p className="text-[10px] text-on-surface-variant mt-2 opacity-70 truncate">{item.note}</p>
                      )}
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Explore Features ──────────────────────────── */}
      <ExploreSection />

      {/* ── About + FAQ ───────────────────────────────── */}
      <AboutSection />

      {/* ── Data Source Attribution ───────────────────── */}
      <DataSourceBadge />

      {/* ── Floating Price Alert (Glassmorphism) ───────── */}
      <AnimatePresence>
        {overview && !loadingOverview && !alertDismissed && Math.abs(overview.priceChange) >= 10 && (
          <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.95, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 24, scale: 0.95, x: '-50%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-[5.25rem] md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 px-4.5 py-2.5 rounded-full glass-card border border-white/45 dark:bg-zinc-900/90 dark:border-zinc-700/50 shadow-glass-md dark:shadow-black/60 text-zinc-900 dark:text-zinc-100 text-body-sm font-medium w-max max-w-[calc(100vw-2.5rem)] text-ellipsis overflow-hidden"
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="text-base leading-none shrink-0" aria-hidden="true">
                {overview.priceChange >= 0 ? '📈' : '📉'}
              </span>
              <span className="text-secondary dark:text-orange-300 font-extrabold tracking-tight shrink-0 text-xs sm:text-sm">【波動警報】</span>
              <span className="text-zinc-800 dark:text-zinc-100 text-xs sm:text-sm truncate">
                {overview.marketName} 今日均價 ${formatPrice(overview.avgPrice)}，較昨日{overview.priceChange >= 0 ? '上漲' : '下跌'}{' '}
                <span className={`font-black ${overview.priceChange >= 0 ? 'text-error dark:text-red-400' : 'text-primary dark:text-emerald-400'}`}>
                  {Math.abs(overview.priceChange).toFixed(1)}%
                </span>
              </span>
            </div>
            <button
              onClick={() => setAlertDismissed(true)}
              className="w-5 h-5 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 leading-none text-xs flex-shrink-0 transition-colors"
              aria-label="關閉警報"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
