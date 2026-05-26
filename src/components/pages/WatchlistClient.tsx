'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { TrendChip } from '@/components/ui/TrendChip'
import { formatPrice } from '@/lib/utils'
import { getWatchlist, removeFromWatchlist } from '@/lib/watchlist'
import type { WatchlistItem } from '@/lib/types'

interface WatchlistSnapshot {
  price: number
  change: number
  history: number[]
  error?: string
}

function Sparkline({ data, isUp }: { data: number[]; isUp: boolean }) {
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
  const gradId = `spark-${isUp ? 'up' : 'down'}`

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

      const entries = await Promise.all(items.map(async (item) => {
        try {
          const [pricesRes, historyRes] = await Promise.all([
            fetch(`/api/prices?crop=${encodeURIComponent(item.cropName)}`),
            fetch(`/api/prices/history?crop=${encodeURIComponent(item.cropName)}&period=1W`),
          ])

          const pricesJson = await pricesRes.json()
          const historyJson = await historyRes.json()

          if (!pricesRes.ok || !Array.isArray(pricesJson) || pricesJson.length === 0) {
            throw new Error(pricesJson.error || '目前無法取得價格資料')
          }

          const current = pricesJson.find((entry: { cropName: string }) => entry.cropName === item.cropName) ?? pricesJson[0]
          const history = historyRes.ok && Array.isArray(historyJson.data)
            ? historyJson.data
                .filter((point: { avgPrice: number | null }) => point.avgPrice !== null)
                .slice(-7)
                .map((point: { avgPrice: number }) => point.avgPrice)
            : []

          return [item.cropCode, {
            price: current.avgPrice,
            change: current.priceChange ?? 0,
            history: history.length > 0 ? history : [current.avgPrice],
          }] as const
        } catch (error) {
          return [item.cropCode, {
            price: 0,
            change: 0,
            history: [0],
            error: error instanceof Error ? error.message : '目前無法取得價格資料',
          }] as const
        }
      }))

      setSnapshots(Object.fromEntries(entries))
      setLoading(false)
    }

    loadSnapshots()
  }, [items, mounted])

  function handleRemove(cropCode: string) {
    removeFromWatchlist(cropCode)
    setItems(getWatchlist())
  }

  if (!mounted) return null

  return (
    <div className="px-section-margin py-section-margin max-w-2xl mx-auto">
      <div className="mb-section-margin flex justify-between items-end">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">我的觀察名單</h2>
          <p className="text-body-md text-on-surface-variant mt-1">即時追蹤您最關心的農產品價格動態</p>
        </div>
        <span className="text-label-bold text-outline">共 {items.length} 項</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-6xl block mb-4">🌿</span>
          <p className="text-body-lg text-on-surface font-semibold">尚無收藏項目</p>
          <p className="text-body-md text-on-surface-variant mt-2">在作物詳情頁點擊愛心即可加入追蹤</p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>search</span>
            搜尋作物
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const data = snapshots[item.cropCode]
            const isUp = (data?.change ?? 0) > 0
            return (
              <GlassCard key={`${item.cropCode}-${index}`} className="rounded-xl px-4 py-3">
                <div className="flex justify-between items-start">
                  <Link href={`/produce/${encodeURIComponent(item.cropName)}`} className="flex items-center gap-3 flex-1">
                    <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-lg shadow-sm border border-white/60 flex-shrink-0">
                      {item.emoji}
                    </div>
                    <div>
                      <h3 className="text-on-surface text-base font-semibold leading-tight">{item.cropName}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-on-surface-variant">每公斤</span>
                        <TrendChip change={data?.change ?? 0} size="sm" />
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleRemove(item.cropCode)}
                    className="text-error/80 hover:text-error transition-colors p-1 touch-target flex items-center justify-center"
                    aria-label="移除收藏"
                  >
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      favorite
                    </span>
                  </button>
                </div>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <span className={`font-bold text-xl ${isUp ? 'text-error' : 'text-primary'}`}>
                      {loading && !data ? '載入中…' : data && data.price > 0 ? `$${formatPrice(data.price)}` : '--'}
                    </span>
                    {data?.error && (
                      <p className="text-body-sm text-on-surface-variant mt-1">{data.error}</p>
                    )}
                  </div>
                  {data && data.history.every((point) => point > 0) ? (
                    <Sparkline data={data.history} isUp={isUp} />
                  ) : (
                    <span className="text-body-sm text-on-surface-variant">暫無走勢</span>
                  )}
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
