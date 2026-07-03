'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { TrendChip } from '@/components/ui/TrendChip'
import { CropIcon } from '@/components/ui/CropIcon'
import { formatPrice } from '@/lib/utils'
import { getWatchlist, removeFromWatchlist } from '@/lib/watchlist'
import type { WatchlistItem } from '@/lib/types'
import { m, AnimatePresence } from 'framer-motion'
import { triggerHaptic, hapticPatterns } from '@/lib/haptics'

const watchlistStaggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
}

const watchlistCardVariant = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 350, damping: 26 },
  },
}

interface WatchlistSnapshot {
  price: number
  change: number
  history: number[]
  error?: string
}

function Sparkline({ data, isUp, id }: { data: number[]; isUp: boolean; id: string }) {
  const normalizedData = data.length > 1 ? data : [data[0], data[0]]
  const max = Math.max(...normalizedData)
  const min = Math.min(...normalizedData)
  const range = max - min || 1
  const w = 100, h = 30
  const points = normalizedData.map((v, i) => {
    const x = (i / (normalizedData.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  const color = isUp ? '#ba1a1a' : '#0d631b'
  const gradId = `spark-${id}-${isUp ? 'up' : 'down'}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-24 h-6" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${points} ${w},${h}`} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function WatchlistClient() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [mounted, setMounted] = useState(false)
  const [snapshots, setSnapshots] = useState<Record<string, WatchlistSnapshot>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setItems(getWatchlist())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }

    if (items.length === 0) {
      setSnapshots({})
      return
    }

    async function loadSnapshots() {
      setLoading(true)

      // Single batch request for all watched crops (replaces 2 requests per item).
      const crops = items.map((item) => item.cropName)
      const fallback = (msg: string) =>
        Object.fromEntries(
          items.map((item) => [
            item.cropCode,
            { price: 0, change: 0, history: [0], error: msg },
          ]),
        )

      try {
        const res = await fetch(
          `/api/prices/watchlist?crops=${encodeURIComponent(crops.join(','))}`,
        )
        const json = await res.json()
        if (!res.ok || !json.snapshots) {
          throw new Error(json.error || '目前無法取得價格資料')
        }

        const snapshots = Object.fromEntries(
          items.map((item) => {
            const snap = json.snapshots[item.cropName]
            if (!snap) {
              return [
                item.cropCode,
                { price: 0, change: 0, history: [0], error: '目前無法取得價格資料' },
              ] as const
            }
            return [item.cropCode, snap] as const
          }),
        )
        setSnapshots(snapshots)
      } catch (error) {
        setSnapshots(
          fallback(error instanceof Error ? error.message : '目前無法取得價格資料'),
        )
      }
      setLoading(false)
    }

    loadSnapshots()
  }, [items, mounted])

  function handleRemove(cropCode: string) {
    triggerHaptic(hapticPatterns.toggle)
    removeFromWatchlist(cropCode)
    setItems(getWatchlist())
  }

  const latestAddedItem = useMemo(() => (
    items.reduce<WatchlistItem | null>((latest, item) => {
      if (!latest) return item
      return new Date(item.addedAt).getTime() > new Date(latest.addedAt).getTime() ? item : latest
    }, null)
  ), [items])

  const readySnapshots = useMemo(
    () => items
      .map((item) => snapshots[item.cropCode])
      .filter((snapshot): snapshot is WatchlistSnapshot => Boolean(snapshot) && !snapshot.error && snapshot.price > 0),
    [items, snapshots]
  )

  const risingCount = readySnapshots.filter((snapshot) => snapshot.change > 0).length
  const softCount = readySnapshots.filter((snapshot) => snapshot.change < 0).length
  const averageTrackedPrice = readySnapshots.length > 0
    ? readySnapshots.reduce((sum, snapshot) => sum + snapshot.price, 0) / readySnapshots.length
    : null
  const syncedCount = items.filter((item) => snapshots[item.cropCode] && !snapshots[item.cropCode].error).length

  const summaryCards = [
    {
      label: '追蹤項目',
      value: `${items.length} 項`,
      meta: items.length === 0 ? '先從搜尋加入常買作物' : '你的日常觀察清單',
    },
    {
      label: '同步狀態',
      value: loading ? '同步中' : `${syncedCount}/${items.length || 0}`,
      meta: loading ? '正在抓取最新行情' : '已取得即時快照',
    },
    {
      label: '平均均價',
      value: averageTrackedPrice === null ? '—' : `$${formatPrice(averageTrackedPrice)}`,
      meta: averageTrackedPrice === null ? '等待資料' : '每公斤均價',
    },
  ]

  const deskNotes = [
    {
      label: '上漲項目',
      value: items.length === 0 ? '—' : `${risingCount} 項`,
      meta: '快速找出今天變熱的作物',
    },
    {
      label: '回穩項目',
      value: items.length === 0 ? '—' : `${softCount} 項`,
      meta: '適合回頭看進貨節奏',
    },
    {
      label: '最近加入',
      value: latestAddedItem?.cropName ?? '尚未加入',
      meta: latestAddedItem ? `加入於 ${new Date(latestAddedItem.addedAt).toLocaleDateString('zh-TW')}` : '從搜尋頁開始建立名單',
    },
  ]

  if (!mounted) return null

  return (
    <div className="home-dashboard-shell pb-8">
      <div className="px-section-margin py-4 md:py-6 space-y-section-margin">
        <h1 className="sr-only">追蹤清單</h1>

        {items.length === 0 ? (
          <section className="relative overflow-hidden glass-card rounded-3xl p-8 sm:p-12 text-center border border-white/40 dark:border-zinc-800/40 shadow-sm">
            {/* Background glowing gradients */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <m.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-6"
            >
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                monitoring
              </span>
              {/* Little floating heart */}
              <m.span 
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute -top-1 -right-1 material-symbols-outlined text-error text-xl bg-white dark:bg-zinc-900 rounded-full p-0.5 shadow-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </m.span>
            </m.div>

            <h2 className="text-headline-md font-bold text-on-surface">打造你的專屬農時行情</h2>
            <p className="text-body-md text-on-surface-variant mt-3 max-w-md mx-auto leading-relaxed">
              目前還沒有追蹤任何作物。只要在作物詳情頁點擊愛心，就能把最常關注的菜價、果價收進這裡，在手機上單手即可輕鬆掌握最新的每日批發走勢。
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/search"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary text-white px-6 py-3.5 text-body-sm font-bold shadow-md shadow-primary/15 hover:bg-primary-hover transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>search</span>
                立即搜尋想看的作物
              </Link>
              <Link
                href="/seasonal"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant/40 bg-white/50 hover:bg-white/85 dark:bg-black/20 dark:hover:bg-black/35 px-6 py-3.5 text-body-sm font-semibold text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>spa</span>
                查看當季盛產推薦
              </Link>
            </div>

            {/* Quick recommendation pill list */}
            <div className="mt-12 pt-8 border-t border-dashed border-outline-variant/20">
              <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-[0.12em]">熱門追蹤推薦</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {['高麗菜', '香蕉', '九層塔', '青蔥', '小番茄'].map((crop) => (
                  <Link
                    key={crop}
                    href={`/produce/${encodeURIComponent(crop)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container/50 hover:bg-primary/5 border border-outline-variant/20 hover:border-primary/20 text-body-sm font-medium text-on-surface transition-all active:scale-95"
                  >
                    <CropIcon name={crop} className="w-4 h-4" />
                    <span>{crop}</span>
                    <span className="material-symbols-outlined text-xs text-on-surface-variant">arrow_forward</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="section-shell">
            <div className="section-heading-row mb-5">
              <div>
                <p className="section-kicker">Tracked crops</p>
                <h2 className="text-headline-md font-semibold text-on-surface">即時行情卡片</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  卡片先給你價格、漲跌與近 7 日節奏；手機上保留單手可掃讀的密度。
                </p>
              </div>
              <div className="result-meta-bar w-full md:w-auto md:min-w-[16rem]">
                <span className="text-body-sm text-on-surface">已同步 {syncedCount} / {items.length} 項</span>
                <span className="text-label-bold text-outline">上漲 {risingCount} 項</span>
              </div>
            </div>

            <m.div
              variants={watchlistStaggerContainer}
              initial="hidden"
              animate="show"
              layout
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {items.map((item, index) => {
                  const data = snapshots[item.cropCode]
                  const isUp = (data?.change ?? 0) > 0
                  const addedLabel = new Date(item.addedAt).toLocaleDateString('zh-TW', {
                    month: 'numeric',
                    day: 'numeric',
                  })

                  return (
                    <m.div
                      key={item.cropCode}
                      variants={watchlistCardVariant}
                      layout
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                      className="h-full"
                    >
                      <article
                        className="glass-card rounded-3xl p-4 sm:p-5 flex flex-col gap-4 min-h-[15.5rem] h-full shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link href={`/produce/${encodeURIComponent(item.cropName)}`} prefetch={false} className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-11 h-11 rounded-full bg-white/80 border border-white/60 flex items-center justify-center shadow-sm flex-shrink-0">
                              <CropIcon name={item.cropName} className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-on-surface text-body-lg font-semibold leading-tight truncate">{item.cropName}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-label-sm text-on-surface-variant">加入於 {addedLabel}</span>
                                <TrendChip change={data?.change ?? 0} size="sm" />
                              </div>
                            </div>
                          </Link>
                          <m.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                            onClick={() => handleRemove(item.cropCode)}
                            className="touch-target flex items-center justify-center w-11 h-11 rounded-full border border-error/20 bg-white/45 text-error/85 hover:text-error hover:bg-white/70 transition-colors"
                            aria-label={`移除 ${item.cropName}`}
                          >
                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                              favorite
                            </span>
                          </m.button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6.5rem] sm:items-end">
                          <div>
                            <p className="text-label-sm uppercase tracking-[0.12em] text-on-surface-variant">今日均價 · 元 / 公斤</p>
                            <div className="flex items-end gap-2 mt-1 flex-wrap">
                              <span className={`font-black text-4xl leading-none ${isUp ? 'text-error' : 'text-primary'}`}>
                                {loading && !data ? '...' : data && data.price > 0 ? `$${formatPrice(data.price)}` : '--'}
                              </span>
                              <span className="text-body-sm text-on-surface-variant pb-0.5">
                                {data?.change === 0 ? '持平' : data?.change ? `${data.change > 0 ? '+' : ''}${formatPrice(Math.abs(data.change))}` : '等待資料'}
                              </span>
                            </div>
                            {data?.error ? (
                              <p className="text-body-sm text-on-surface-variant mt-2">{data.error}</p>
                            ) : (
                              <p className="text-body-sm text-on-surface-variant mt-2">近 7 日快照已整理，可直接進單品頁看完整脈絡。</p>
                            )}
                          </div>

                          <div className="sm:justify-self-end">
                            {data && data.history.every((point) => point > 0) ? (
                              <div className="rounded-2xl border border-white/50 bg-white/45 px-3 py-2">
                                <Sparkline data={data.history} isUp={isUp} id={item.cropCode} />
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-white/50 bg-white/35 px-3 py-3 text-center text-body-sm text-on-surface-variant">
                                暫無走勢
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-auto flex flex-wrap gap-2">
                          <span className={`market-status-chip ${isUp ? 'market-status-chip--critical' : data && data.change < 0 ? '' : 'market-status-chip--warm'}`}>
                            {data?.change === 0 ? '價格持平' : isUp ? '價格偏熱' : data && data.change < 0 ? '價格回落' : '等待同步'}
                          </span>
                          <span className="market-status-chip">手機快速查看</span>
                        </div>

                        <div className="pt-1">
                          <Link
                            href={`/produce/${encodeURIComponent(item.cropName)}`}
                            className="inline-flex items-center gap-2 text-body-sm font-semibold text-primary"
                          >
                            進入單品詳情
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
                          </Link>
                        </div>
                      </article>
                    </m.div>
                  )
                })}
              </AnimatePresence>
            </m.div>
          </section>
        )}
      </div>
    </div>
  )
}