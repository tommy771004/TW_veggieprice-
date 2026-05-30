'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendChip } from '@/components/ui/TrendChip'
import dynamic from 'next/dynamic'
import { ProduceProductJsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/env'

const PriceLineChart = dynamic(
  () => import('@/components/charts/PriceLineChart').then(m => ({ default: m.PriceLineChart })),
  {
    loading: () => <div className="h-56 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] animate-pulse flex items-center justify-center text-xs text-on-surface-variant opacity-60">圖表載入中...</div>,
    ssr: false,
  }
)
const VolumeBarChart = dynamic(
  () => import('@/components/charts/VolumeBarChart').then(m => ({ default: m.VolumeBarChart })),
  {
    loading: () => <div className="h-36 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] animate-pulse flex items-center justify-center text-xs text-on-surface-variant opacity-60">圖表載入中...</div>,
    ssr: false,
  }
)
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { CropIcon } from '@/components/ui/CropIcon'
import { formatPrice, getCropEmoji, subtractDays, todayISO } from '@/lib/utils'
import { toggleWatchlist, isInWatchlist } from '@/lib/watchlist'
import { triggerHaptic, hapticPatterns } from '@/lib/haptics'
import { getProduceCategory } from '@/lib/produce'
import type {
  PricePeriod,
  MarketComparison,
  PriceHistoryPoint,
  TraceabilitySummaryItem,
  ProductCostInsight,
  CostSurveyFile,
  CropInfo,
} from '@/lib/types'
import Link from 'next/link'

const PERIODS: PricePeriod[] = ['1W', '1M', '3M']

export function ProduceClient({ cropName }: { cropName: string }) {
  const router = useRouter()

  interface WeatherData {
    county: string
    temp: number | null
    humidity: number | null
    rainfall: number | null
  }

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState('')

  const [period, setPeriod] = useState<PricePeriod>('1W')
  const [cropInfo, setCropInfo] = useState<CropInfo | null>(null)
  const [history, setHistory] = useState<PriceHistoryPoint[]>([])
  const [closedDays, setClosedDays] = useState<string[]>([])
  const [markets, setMarkets] = useState<MarketComparison[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [marketsLoading, setMarketsLoading] = useState(true)
  const [traceabilityLoading, setTraceabilityLoading] = useState(true)
  const [costLoading, setCostLoading] = useState(true)
  const [infoLoading, setInfoLoading] = useState(true)

  const [streamingStatus, setStreamingStatus] = useState<'idle' | 'loading_chunks' | 'complete'>('idle')
  const [streamingProgress, setStreamingProgress] = useState(0)
  const [streamingTotal, setStreamingTotal] = useState(0)

  const [updatedAt, setUpdatedAt] = useState<string>('')
  const [inWatchlist, setInWatchlist] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [marketsError, setMarketsError] = useState('')
  const [traceability, setTraceability] = useState<TraceabilitySummaryItem[]>([])
  const [costInsight, setCostInsight] = useState<ProductCostInsight | null>(null)
  const [costFiles, setCostFiles] = useState<CostSurveyFile[]>([])
  const [traceabilityError, setTraceabilityError] = useState('')
  const [costError, setCostError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const cropCode = `CROP_${cropName.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffff, 0).toString(16).toUpperCase().padStart(4, '0')}`

  useEffect(() => {
    setInWatchlist(isInWatchlist(cropCode))
  }, [cropCode])

  const pulseScrollRef = useRef<HTMLDivElement>(null)
  const scrollPulse = (dir: 'left' | 'right') => {
    if (pulseScrollRef.current) {
      const scrollAmount = dir === 'left' ? -280 : 280
      pulseScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Fetch History
  useEffect(() => {
    let active = true

    async function loadHistory() {
      setHistoryLoading(true)
      setHistoryError('')
      setStreamingStatus('idle')
      setStreamingProgress(0)
      setStreamingTotal(0)

      const todayStr = todayISO()
      function getDaysAgoISO(days: number): string {
        return subtractDays(todayStr, days)
      }

      try {
        const category = getProduceCategory(cropName)
        if (category === 'meat') {
          const res = await fetch('/data/latest-livestock.json')
          if (!active) return
          if (!res.ok) throw new Error('查無肉品歷史資料')
          const json = await res.json()
          if (!active) return
          
          const lData = json.data || {}
          let points: any[] = []
          
          if (cropName.includes('豬')) {
            const grouped = (lData.pork || []).reduce((acc: any, curr: any) => {
              if (!acc[curr.TransDate]) acc[curr.TransDate] = []
              acc[curr.TransDate].push(curr)
              return acc
            }, {})
            points = Object.keys(grouped).map(k => {
              const items = grouped[k]
              const valid = items.filter((r: any) => r.TransNum_Total > 0 && r.TransNum_AvgPrice > 0)
              let avg = null, vol = null
              if (valid.length > 0) {
                const tv = valid.reduce((s: number, r: any) => s + r.TransNum_Total, 0)
                const tval = valid.reduce((s: number, r: any) => s + (r.TransNum_Total * r.TransNum_AvgPrice), 0)
                avg = tv > 0 ? (tval / tv) : 0
                vol = tv
              }
              const yy = parseInt(k.substring(0, 3)) + 1911
              const mm = k.substring(3, 5)
              const dd = k.substring(5, 7)
              return { date: `${yy}-${mm}-${dd}`, label: `${parseInt(mm)}/${parseInt(dd)}`, avgPrice: avg ? Math.round(avg * 10) / 10 : null, upperPrice: null, lowerPrice: null, volume: vol, isClosed: avg === null }
            })
          } else if (cropName.includes('蛋')) {
            points = (lData.egg_chicken || []).map((r: any) => {
              const iso = r.TransDate.replace(/\//g, '-')
              const [, mm, dd] = iso.split('-')
              const p = r.egg_Price ? parseFloat(r.egg_Price) : null
              return { date: iso, label: `${parseInt(mm)}/${parseInt(dd)}`, avgPrice: p, upperPrice: null, lowerPrice: null, volume: null, isClosed: p === null || isNaN(p) }
            })
          } else if (cropName.includes('白肉雞')) {
            points = (lData.egg_chicken || []).map((r: any) => {
              const iso = r.TransDate.replace(/\//g, '-')
              const [, mm, dd] = iso.split('-')
              const p = r.TaijinPrice_2_0kgup || r.TaijinPrice_1_75kg_1_95kg || r['TaijinPrice_2.0kgup'] || r['TaijinPrice_1.75kg_1.95kg']
              const pv = p ? parseFloat(p) : null
              return { date: iso, label: `${parseInt(mm)}/${parseInt(dd)}`, avgPrice: pv, upperPrice: null, lowerPrice: null, volume: null, isClosed: pv === null || isNaN(pv) }
            })
          } else if (cropName.includes('紅羽土雞')) {
            points = (lData.red_feather || []).map((r: any) => {
              const iso = r.TransDate.replace(/\//g, '-')
              const [, mm, dd] = iso.split('-')
              const p = r.RedFeather_C_M || r.RedFeather_N_M
              const pv = p ? parseFloat(p) : null
              return { date: iso, label: `${parseInt(mm)}/${parseInt(dd)}`, avgPrice: pv, upperPrice: null, lowerPrice: null, volume: null, isClosed: pv === null || isNaN(pv) }
            })
          } else if (cropName.includes('鵝')) {
            points = (lData.goose_duck || []).map((r: any) => {
              const iso = r.TransDate.replace(/\//g, '-')
              const [, mm, dd] = iso.split('-')
              const p = r.Goose_WR_TaijinPrice || r.Goose_TaijinPrice
              const pv = p && p !== '休市' ? parseFloat(p) : null
              return { date: iso, label: `${parseInt(mm)}/${parseInt(dd)}`, avgPrice: pv, upperPrice: null, lowerPrice: null, volume: null, isClosed: pv === null || isNaN(pv) }
            })
          } else if (cropName.includes('鴨')) {
            points = (lData.goose_duck || []).map((r: any) => {
              const iso = r.TransDate.replace(/\//g, '-')
              const [, mm, dd] = iso.split('-')
              const p = r.Duck_75D_TaijinPrice || r.Duck_TaijinPrice || r.Duck_M_TaijinPrice
              const pv = p && p !== '休市' ? parseFloat(p) : null
              return { date: iso, label: `${parseInt(mm)}/${parseInt(dd)}`, avgPrice: pv, upperPrice: null, lowerPrice: null, volume: null, isClosed: pv === null || isNaN(pv) }
            })
          } else if (cropName.includes('羊')) {
            const grouped = (lData.sheep || []).reduce((acc: any, curr: any) => {
              if (!acc[curr.transDate]) acc[curr.transDate] = []
              acc[curr.transDate].push(curr)
              return acc
            }, {})
            points = Object.keys(grouped).map(k => {
              const items = grouped[k]
              const valid = items.filter((r: any) => parseFloat(r.avgPrice) > 0)
              let avg = null, vol = null
              if (valid.length > 0) {
                const tv = valid.reduce((s: number, r: any) => s + (parseFloat(r.quantity) || 0), 0)
                const tval = valid.reduce((s: number, r: any) => s + (parseFloat(r.quantity) || 0) * parseFloat(r.avgPrice), 0)
                avg = tv > 0 ? (tval / tv) : 0
                vol = tv
              }
              const iso = k.replace(/\//g, '-')
              const [, mm, dd] = iso.split('-')
              return { date: iso, label: `${parseInt(mm)}/${parseInt(dd)}`, avgPrice: avg ? Math.round(avg * 10) / 10 : null, upperPrice: null, lowerPrice: null, volume: vol, isClosed: avg === null }
            })
          }

          const daysToSubtract = period === '1W' ? 7 : (period === '1M' ? 30 : 90)
          const startLimit = getDaysAgoISO(daysToSubtract)
          
          // Filter out points that are null or out of range, and sort chronologically
          const validPoints = points
            .filter(p => p.date >= startLimit && p.date <= todayStr && p.avgPrice !== null)
            .sort((a, b) => a.date.localeCompare(b.date))

          // If we only have 1 data point (e.g. pork dataset has only 1 snapshot day),
          // prepend a duplicate day before so Recharts can draw a beautiful flat trend line.
          if (validPoints.length === 1) {
            const single = validPoints[0]
            const prevDate = subtractDays(single.date, 1)
            const [, pM, pD] = prevDate.split('-')
            validPoints.unshift({
              ...single,
              date: prevDate,
              label: `${parseInt(pM)}/${parseInt(pD)}`,
            })
          }

          if (validPoints.length === 0) throw new Error('查無近期交易資料')
          setHistory(validPoints)
          setClosedDays([]) // No closed day stripe clutter for meat/poultry products
          if (json.metadata?.lastUpdated) setUpdatedAt(json.metadata.lastUpdated)
          setStreamingStatus('complete')
          setHistoryLoading(false)
          return
        }

        if (period === '1W') {
          const startStr = getDaysAgoISO(7)
          const hRes = await fetch(`/api/prices/history?crop=${encodeURIComponent(cropName)}&startDate=${startStr}&endDate=${todayStr}`)
          if (!active) return
          const json = await hRes.json()
          if (!active) return
          if (hRes.ok) {
            setHistory(json.data ?? [])
            setClosedDays(json.closedDays ?? [])
            if (json.updatedAt) setUpdatedAt(json.updatedAt)
            setStreamingStatus('complete')
          } else {
            throw new Error(json.error || '查無此作物的歷史資料')
          }
        } else if (period === '1M') {
          const startStr = getDaysAgoISO(30)
          const hRes = await fetch(`/api/prices/history?crop=${encodeURIComponent(cropName)}&startDate=${startStr}&endDate=${todayStr}`)
          if (!active) return
          const json = await hRes.json()
          if (!active) return
          if (hRes.ok) {
            setHistory(json.data ?? [])
            setClosedDays(json.closedDays ?? [])
            if (json.updatedAt) setUpdatedAt(json.updatedAt)
            setStreamingStatus('complete')
          } else {
            throw new Error(json.error || '查無此作物的歷史資料')
          }
        } else if (period === '3M') {
          // Stage 1: Load 1 Month instant data
          const startStr30 = getDaysAgoISO(30)
          const hRes = await fetch(`/api/prices/history?crop=${encodeURIComponent(cropName)}&startDate=${startStr30}&endDate=${todayStr}`)
          if (!active) return
          const json = await hRes.json()
          if (!active) return

          if (!hRes.ok) {
            throw new Error(json.error || '查無此作物的歷史資料')
          }

          let mergedData = [...(json.data ?? [])]
          let mergedClosed = [...(json.closedDays ?? [])]
          setHistory(mergedData)
          setClosedDays(mergedClosed)
          if (json.updatedAt) setUpdatedAt(json.updatedAt)

          // We loaded the first segment. loader disappears!
          setHistoryLoading(false)

          // Stage 2: Background fetch the remaining 60 days
          setStreamingStatus('loading_chunks')
          setStreamingTotal(1)
          setStreamingProgress(0)

          const startStrRemaining = getDaysAgoISO(90)
          const endStrRemaining = getDaysAgoISO(31)

          try {
            const hRes2 = await fetch(`/api/prices/history?crop=${encodeURIComponent(cropName)}&startDate=${startStrRemaining}&endDate=${endStrRemaining}`)
            if (!active) return
            const json2 = await hRes2.json()
            if (!active) return

            if (hRes2.ok) {
              const prevPoints = json2.data ?? []
              const prevClosed = json2.closedDays ?? []

              // Merge and sort
              const uniqueDataMap = new Map<string, PriceHistoryPoint>()
              mergedData.concat(prevPoints).forEach(item => {
                uniqueDataMap.set(item.date, item)
              })
              const finalData = Array.from(uniqueDataMap.values()).sort((a, b) => a.date.localeCompare(b.date))
              const finalClosed = Array.from(new Set([...mergedClosed, ...prevClosed])).sort()

              setHistory(finalData)
              setClosedDays(finalClosed)
              setStreamingProgress(1)
            }
          } catch (e) {
            console.error('Failed to stream 3M chunk', e)
          } finally {
            if (active) setStreamingStatus('complete')
          }
        }
      } catch (err: any) {
        if (active) {
          setHistory([])
          setClosedDays([])
          setUpdatedAt('')
          setHistoryError(err.message || '目前無法取得歷史走勢資料')
        }
      } finally {
        if (active) setHistoryLoading(false)
      }
    }

    loadHistory()

    return () => {
      active = false
    }
  }, [cropName, period, reloadKey])

  // Fetch Markets
  useEffect(() => {
    let active = true
    async function loadMarkets() {
      setMarketsLoading(true)
      setMarketsError('')
      
      const category = getProduceCategory(cropName)
      const st = category === 'fruit' ? 'Fruit'
        : category === 'meat' ? 'meat'
        : category === 'seafood' ? 'seafood'
        : category === 'flower' ? 'Flower'
        : 'Veg'

      try {
        const mRes = await fetch(`/api/prices/markets?crop=${encodeURIComponent(cropName)}&type=${st}`)
        const marketsJson = await mRes.json()
        if (!active) return
        if (mRes.ok) {
          setMarkets(marketsJson)
        } else {
          setMarkets([])
          setMarketsError(marketsJson.error || '目前無法載入市場比價資料')
        }
      } catch {
        if (!active) return
        setMarkets([])
        setMarketsError('目前無法載入市場比價資料')
      } finally {
        if (active) setMarketsLoading(false)
      }
    }
    loadMarkets()
    return () => { active = false }
  }, [cropName, reloadKey])

  // Fetch Traceability
  useEffect(() => {
    let active = true
    async function loadTraceability() {
      setTraceabilityLoading(true)
      setTraceabilityError('')
      try {
        const traceRes = await fetch(`/api/prices/traceability?crop=${encodeURIComponent(cropName)}&limit=5`)
        const traceJson = await traceRes.json()
        if (!active) return
        if (traceRes.ok) {
          setTraceability((traceJson.items ?? []) as TraceabilitySummaryItem[])
        } else {
          setTraceability([])
          setTraceabilityError(traceJson.error || '目前無法取得追溯資料')
        }
      } catch {
        if (!active) return
        setTraceability([])
        setTraceabilityError('目前無法取得追溯資料')
      } finally {
        if (active) setTraceabilityLoading(false)
      }
    }
    loadTraceability()
    return () => { active = false }
  }, [cropName, reloadKey])

  // Fetch Cost
  useEffect(() => {
    let active = true
    async function loadCost() {
      setCostLoading(true)
      setCostError('')
      try {
        const costRes = await fetch(`/api/prices/cost?crop=${encodeURIComponent(cropName)}`)
        const costJson = await costRes.json()
        if (!active) return
        if (costRes.ok) {
          setCostInsight((costJson.insight ?? null) as ProductCostInsight | null)
          setCostFiles((costJson.insight?.costFiles ?? []) as CostSurveyFile[])
        } else {
          setCostInsight(null)
          setCostFiles([])
          setCostError(costJson.error || '目前無法取得成本資料')
        }
      } catch {
        if (!active) return
        setCostInsight(null)
        setCostFiles([])
        setCostError('目前無法取得成本資料')
      } finally {
        if (active) setCostLoading(false)
      }
    }
    loadCost()
    return () => { active = false }
  }, [cropName, reloadKey])

  // Fetch Crop Info
  useEffect(() => {
    let active = true
    async function loadInfo() {
      setInfoLoading(true)
      try {
        const infoRes = await fetch(`/api/produce/info?crop=${encodeURIComponent(cropName)}`)
        const infoJson = await infoRes.json()
        if (!active) return
        setCropInfo(infoRes.ok
          ? (infoJson as CropInfo)
          : { feature: '天然新鮮農產品', season: '全年供應', origin: '台灣各地' }
        )
      } catch {
        if (!active) return
        setCropInfo({ feature: '天然新鮮農產品', season: '全年供應', origin: '台灣各地' })
      } finally {
        if (active) setInfoLoading(false)
      }
    }
    loadInfo()
    return () => { active = false }
  }, [cropName, reloadKey])

  useEffect(() => {
    let active = true
    async function fetchWeather(origin: string) {
      if (!origin || origin === '台灣各地') return
      setWeatherLoading(true)
      setWeatherError('')
      setWeather(null)
      try {
        const res = await fetch(`/api/weather?county=${encodeURIComponent(origin)}`)
        const json = await res.json()
        if (!active) return
        if (res.ok) {
          setWeather(json as WeatherData)
        } else {
          setWeatherError(json.error || '無法取得氣象資料')
        }
      } catch (err) {
        if (!active) return
        setWeatherError('取得氣象資料失敗')
      } finally {
        if (active) setWeatherLoading(false)
      }
    }
    
    if (cropInfo?.origin) {
      fetchWeather(cropInfo.origin)
    }
    return () => { active = false }
  }, [cropInfo?.origin])

  const validHistory = history.filter((point): point is PriceHistoryPoint & { avgPrice: number } => point.avgPrice !== null)
  const latestPrice = validHistory[validHistory.length - 1]?.avgPrice ?? 0
  const prevPrice = validHistory[validHistory.length - 2]?.avgPrice ?? latestPrice
  const priceChange = prevPrice ? ((latestPrice - prevPrice) / prevPrice) * 100 : 0
  const avgCost = costInsight?.avgCostPerKg ?? null
  const costGap = avgCost !== null && latestPrice > 0 ? latestPrice - avgCost : null
  const compareMax = Math.max(latestPrice, avgCost ?? 0, 1)
  const cropCategory = getProduceCategory(cropName)
  const cropCategoryLabel = cropCategory === 'fruit'
    ? '水果類'
    : cropCategory === 'mushroom'
      ? '菇類'
      : cropCategory === 'meat'
        ? '肉類'
        : cropCategory === 'seafood'
          ? '海鮮類'
          : cropCategory === 'flower'
            ? '花卉類'
            : '蔬菜類'
  const searchType = cropCategory === 'fruit' ? 'Fruit'
    : cropCategory === 'meat' ? 'meat'
    : cropCategory === 'seafood' ? 'seafood'
    : cropCategory === 'flower' ? 'Flower'
    : 'Veg'
  const displayAlias = cropName.replace(/（.*）|\(.*\)/g, '').trim()
  const historyWindowLabel = period === '1W' ? '近 7 日' : period === '1M' ? '近 30 日' : '近 90 日'
  const heroSummaryCards = [
    {
      label: '觀察週期',
      value: historyWindowLabel,
      meta: `${history.length} 筆走勢點`,
    },
    {
      label: '比價市場',
      value: marketsLoading ? '讀取中' : `${markets.length} 處`,
      meta: marketsError ? '比價資料暫時不可用' : '跨市場同步比對',
    },
    {
      label: '成本差額',
      value: costGap === null ? '—' : `${costGap >= 0 ? '+' : ''}${costGap.toFixed(1)}`,
      meta: costGap === null ? '等待成本資料' : '元 / 公斤',
    },
  ]
  const fieldNoteRows = [
    {
      label: '特徵',
      value: infoLoading ? '整理中' : cropInfo?.feature ?? '天然新鮮農產品',
    },
    {
      label: '產季',
      value: infoLoading ? '整理中' : cropInfo?.season ?? '全年供應',
    },
    {
      label: '主要產地',
      value: infoLoading ? '整理中' : cropInfo?.origin ?? '台灣各地',
    },
  ]

  // Whether the loaded history dataset includes upper/lower price columns
  const hasHistoryRangeData = history.some((d) => d.upperPrice != null)
  const [showPriceRange, setShowPriceRange] = useState(false)

  function handleToggleWatchlist() {
    // emoji retained only for WatchlistItem data shape; UI renders via <CropIcon>.
    const added = toggleWatchlist({ cropCode, cropName, emoji: getCropEmoji(cropName) })
    setInWatchlist(added)
    if (added) {
      triggerHaptic(hapticPatterns.success)
    } else {
      triggerHaptic(hapticPatterns.toggle)
    }
  }

  return (
    <div className="home-dashboard-shell pb-8">
      {latestPrice > 0 && (
        <ProduceProductJsonLd cropName={cropName} url={`${SITE_URL}/produce/${encodeURIComponent(cropName)}`} price={latestPrice} />
      )}
      <div className="px-section-margin py-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="w-11 h-11 flex items-center justify-center rounded-full text-primary hover:bg-surface-container transition-colors border border-white/40 bg-white/60 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex flex-wrap gap-2 justify-end">
            <span className="market-status-chip">{cropCategoryLabel}</span>
            <span className="market-status-chip">{historyWindowLabel}</span>
            <button
              onClick={handleToggleWatchlist}
              className={`market-status-chip transition-colors ${inWatchlist ? 'market-status-chip--critical' : ''}`}
            >
              <span
                className="material-symbols-outlined text-base"
                style={{ fontVariationSettings: inWatchlist ? "'FILL' 1" : "'FILL' 0" }}
              >
                favorite
              </span>
              {inWatchlist ? '已加入關注' : '加入關注'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-section-margin space-y-section-margin">
        <section className="home-market-stage -mx-3 md:-mx-6 px-3 md:px-6 py-2 md:py-3">
          <div className="market-signal-tape mb-4" aria-hidden="true">
            <span>PRODUCE DETAIL</span>
            <span>WHOLESALE TREND</span>
            <span>TAIWAN ORIGIN</span>
            <span>MARKET NOTEBOOK</span>
          </div>

          <div className="section-heading-row mb-4">
            <div>
              <p className="section-kicker">Produce focus</p>
              <h1 className="text-headline-lg font-black text-on-surface">{cropName} 批發行情</h1>
              <p className="text-body-sm text-on-surface-variant mt-1 max-w-2xl">
                從單品均價、量能、產地與成本一起看，判斷今天這個作物是在穩定區、熱區，還是波動區。
              </p>
              {updatedAt && (
                <p className="text-label-sm text-on-surface-variant flex items-center gap-1 mt-1.5">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>update</span>
                  最後更新：<span suppressHydrationWarning>{new Date(updatedAt).toLocaleString('zh-TW', {
                    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}</span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="market-status-chip">{displayAlias}</span>
              {avgCost !== null && <span className="market-status-chip">成本樣本 {costInsight?.sampleSize ?? 0} 筆</span>}
              {historyError && <span className="market-status-chip market-status-chip--warm">歷史資料部分受限</span>}
            </div>
          </div>

          <div className="home-hero-card rounded-3xl overflow-hidden">
            <div className="px-6 pt-6 pb-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_19rem]">
              <div className="min-w-0 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shadow-lg">
                    <CropIcon name={cropName} className="w-14 h-14" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="market-status-chip market-status-chip--hero">{cropCategoryLabel}</span>
                      <span className="market-status-chip market-status-chip--hero">{displayAlias}</span>
                    </div>
                    <p className="text-label-sm tracking-[0.16em] uppercase font-semibold mb-2 text-white/48">
                      今日批發均價 · 元 / 公斤
                    </p>
                    <div className="flex items-end gap-3 flex-wrap">
                      <span className="text-5xl sm:text-6xl leading-none font-black tabular-nums tracking-tight text-[#fcd34d]">
                        {latestPrice > 0 ? `$${formatPrice(latestPrice)}` : '--'}
                      </span>
                      {latestPrice > 0 ? (
                        <div className="pb-1.5">
                          <TrendChip change={priceChange} />
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-3 text-body-sm text-white/70 max-w-xl">
                      單品頁把近 {historyWindowLabel.replace('近 ', '')} 的走勢、比價與產地背景壓在同一個視角，方便快速判斷進貨節奏。
                    </p>
                  </div>
                </div>

                <div className="relative group/scroller">
                  {/* Scroll buttons for mobile/touch-enhanced feeling */}
                  <button
                    onClick={(e) => { e.preventDefault(); scrollPulse('left') }}
                    className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 text-white/40 transition-all sm:group-hover/scroller:bg-black/20 sm:group-hover/scroller:text-white/80 md:w-10 md:h-10 border border-white/5"
                    aria-label="Scroll left"
                  >
                    <span className="material-symbols-outlined text-xl">chevron_left</span>
                  </button>

                  <div
                    ref={pulseScrollRef}
                    className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-2.5 sm:grid sm:grid-cols-3 sm:overflow-visible sm:gap-2.5 -mx-2 px-2 sm:mx-0 sm:px-0"
                  >
                    {heroSummaryCards.map((card) => (
                      <div
                        key={card.label}
                        className="market-pulse-chip market-pulse-chip--hero shrink-0 w-[85%] snap-center sm:w-auto sm:snap-align-none"
                      >
                        <span>{card.label}</span>
                        <strong>{card.value}</strong>
                        <small>{card.meta}</small>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={(e) => { e.preventDefault(); scrollPulse('right') }}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 text-white/40 transition-all sm:group-hover/scroller:bg-black/20 sm:group-hover/scroller:text-white/80 md:w-10 md:h-10 border border-white/5"
                    aria-label="Scroll right"
                  >
                    <span className="material-symbols-outlined text-xl">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* 產地與生長背景側邊欄 */}
              <div className="hidden lg:block">
                <div className="hero-info-card space-y-3.5 h-[230px] flex flex-col justify-center">
                  <p className="text-label-sm font-bold tracking-wider text-white/50 uppercase">產地與生長背景</p>
                  <div className="space-y-3">
                    {fieldNoteRows.map((note) => (
                      <div key={note.label} className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex flex-col">
                        <span className="text-2xs font-semibold text-white/40">{note.label}</span>
                        <strong className="text-body-sm font-bold text-white mt-0.5">{note.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.85fr)]">
          <div className="section-shell">
            <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4 mb-6">
              <div className="flex flex-col gap-1">
                <p className="section-kicker">Trend desk</p>
                <h3 className="text-headline-md font-semibold text-on-surface">價格趨勢</h3>
                <p className="text-body-sm text-on-surface-variant">
                  觀察 {cropName} 在 {historyWindowLabel} 的均價變化與休市補點。
                </p>
                {streamingStatus === 'loading_chunks' && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-label-sm font-medium animate-pulse self-start transition-opacity duration-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>串流載入歷史中... ({streamingProgress}/{streamingTotal})</span>
                  </div>
                )}
                {hasHistoryRangeData && (
                  <button
                    onClick={() => setShowPriceRange((v) => !v)}
                    className={`inline-flex items-center gap-1 self-start px-2.5 py-0.5 rounded-full text-label-sm font-medium transition-colors ${
                      showPriceRange
                        ? 'bg-primary/12 text-primary border border-primary/30'
                        : 'bg-surface-container text-on-surface-variant border border-outline-variant/40 hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px', lineHeight: 1 }}>
                      {showPriceRange ? 'visibility' : 'visibility_off'}
                    </span>
                    上/下價區間
                  </button>
                )}
              </div>
              <div className="flex bg-surface-container-high rounded-full p-1 gap-0.5 self-end sm:self-auto">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-full text-label-bold transition-colors ${
                      period === p
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-on-surface-variant hover:bg-white/50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {historyLoading ? (
              <div className="skeleton h-56 rounded-xl" />
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 text-on-surface-variant gap-3">
                <span className="text-5xl">🧺</span>
                <p className="text-body-md font-semibold">{historyError || '查無此作物的交易資料'}</p>
                <button
                  onClick={() => setReloadKey((value) => value + 1)}
                  className="text-primary text-label-bold hover:underline"
                >
                  重新載入
                </button>
              </div>
            ) : (
              <PriceLineChart data={history} closedDays={closedDays} height={220} showPriceRange={showPriceRange} />
            )}
          </div>

          <div className="section-shell">
            <div className="section-heading-row gap-3 mb-4">
              <div>
                <p className="section-kicker">Volume pulse</p>
                <h3 className="text-headline-md font-semibold text-on-surface">交易量節奏</h3>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  近 14 筆成交量，用來看市場熱度是不是跟價格同步。
                </p>
              </div>
            </div>

            {historyLoading ? (
              <div className="skeleton h-36 rounded-xl" />
            ) : validHistory.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-body-sm text-on-surface-variant">
                目前沒有可顯示的交易量資料
              </div>
            ) : (
              <VolumeBarChart data={history.slice(-14)} height={156} />
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="section-shell">
            <div className="section-heading-row gap-3 mb-5">
              <div>
                <p className="section-kicker">Crop brief</p>
                <h3 className="text-headline-md font-semibold text-on-surface">作物簡介</h3>
              </div>
            </div>
            {infoLoading || !cropInfo ? (
              <SkeletonCard />
            ) : (
              <div className="space-y-3">
                {[
                  { icon: 'info', label: '特徵', value: cropInfo.feature },
                  { icon: 'calendar_month', label: '產季', value: cropInfo.season },
                  { icon: 'location_on', label: '主要產地', value: cropInfo.origin },
                ].map((row) => (
                  <div key={row.label} className="glass-card rounded-2xl px-4 py-3 flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: '1.25rem' }}>{row.icon}</span>
                    <div>
                      <h4 className="text-label-bold text-on-surface-variant">{row.label}</h4>
                      <p className="text-body-md text-on-surface">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cropInfo?.origin && cropInfo.origin !== '台灣各地' ? (
            <div className="section-shell">
              <div className="section-heading-row gap-3 mb-5">
                <div>
                  <p className="section-kicker">Origin weather</p>
                  <h3 className="text-headline-md font-semibold text-on-surface">
                    產地氣象 ({weather?.county || cropInfo.origin.split('、')[0]})
                  </h3>
                </div>
              </div>
              {weatherLoading ? (
                <div className="skeleton h-32 rounded-xl" />
              ) : weatherError ? (
                <div className="flex flex-col items-center justify-center p-4 text-on-surface-variant gap-2">
                  <span className="material-symbols-outlined text-3xl">cloud_off</span>
                  <p className="text-body-md">{weatherError}</p>
                </div>
              ) : weather ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { icon: 'device_thermostat', label: '溫度', value: weather.temp !== null ? `${weather.temp}°C` : '--' },
                    { icon: 'rainy', label: '日雨量', value: weather.rainfall !== null ? `${weather.rainfall}mm` : '--' },
                    { icon: 'humidity_percentage', label: '濕度', value: weather.humidity !== null ? `${weather.humidity}%` : '--' },
                  ].map((item) => (
                    <div key={item.label} className="market-pulse-chip">
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-primary text-base">{item.icon}</span>
                        {item.label}
                      </span>
                      <strong>{item.value}</strong>
                      <small>來自產地即時觀測</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-on-surface-variant gap-2">
                  <span className="material-symbols-outlined text-3xl">cloud_off</span>
                  <p className="text-body-md">查無產地氣象</p>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="section-shell">
            <div className="section-heading-row gap-3 mb-5">
              <div>
                <p className="section-kicker">Cost spread</p>
                <h3 className="text-headline-md font-semibold text-on-surface">成本與行情對照</h3>
              </div>
            </div>
            {costLoading ? (
              <SkeletonCard />
            ) : costInsight && avgCost !== null ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-body-sm text-on-surface-variant mb-1">
                      <span>批發均價</span>
                      <span className="text-on-surface font-semibold">${formatPrice(latestPrice)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.max((latestPrice / compareMax) * 100, 8)}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-body-sm text-on-surface-variant mb-1">
                      <span>平均成本</span>
                      <span className="text-on-surface font-semibold">${formatPrice(avgCost)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${Math.max((avgCost / compareMax) * 100, 8)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl px-4 py-3">
                  <p className="text-body-md text-on-surface">
                    差額：
                    <span className={`font-semibold ml-1 ${costGap !== null && costGap >= 0 ? 'text-primary' : 'text-error'}`}>
                      {costGap === null ? '—' : `${costGap >= 0 ? '+' : ''}${costGap.toFixed(1)} 元/公斤`}
                    </span>
                  </p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    成本樣本數：{costInsight.sampleSize} 筆，單位：{costInsight.unit}
                  </p>
                </div>
              </div>
            ) : costFiles.length > 0 ? (
              <div className="space-y-3">
                <p className="text-body-sm text-on-surface-variant">農糧署生產成本調查報告（PDF）</p>
                <ul className="space-y-2">
                  {costFiles.map((file, index) => (
                    <li key={index} className="glass-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-body-sm font-semibold text-on-surface">{file.cropName}</p>
                        <p className="text-label-sm text-outline mt-0.5">{file.year} 年度{file.group ? ` ｜ ${file.group}` : ''}</p>
                      </div>
                      <a
                        href={file.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-label-sm text-primary font-medium hover:bg-primary/20 transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>picture_as_pdf</span>
                        開啟
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="py-6 text-center text-on-surface-variant">
                <p className="text-body-md font-semibold text-on-surface">{costError || '目前查無可用成本資料'}</p>
                <p className="text-body-sm mt-1">可稍後重試，或改查其他作物</p>
              </div>
            )}
          </div>

          <div className="section-shell">
            <div className="section-heading-row gap-3 mb-5">
              <div>
                <p className="section-kicker">Market compare</p>
                <h3 className="text-headline-md font-semibold text-on-surface">各區市場比價</h3>
              </div>
            </div>
            {marketsLoading ? (
              <SkeletonCard />
            ) : markets.length === 0 ? (
              <div className="py-8 text-center text-on-surface-variant">
                <p className="text-body-md font-semibold text-on-surface">{marketsError || '目前沒有市場比價資料'}</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {markets.map((m) => (
                  <li key={m.marketName}>
                    <Link
                      href={`/search?q=${encodeURIComponent(cropName)}&market=${encodeURIComponent(m.marketName)}&type=${searchType}`}
                      className="glass-card rounded-2xl px-4 py-3 flex justify-between items-center gap-3 hover:bg-white/75 transition-colors block"
                    >
                      <div>
                        <p className="text-body-lg text-on-surface font-semibold">{m.marketName}</p>
                        <p className="text-label-sm text-on-surface-variant mt-1">點進去看該市場完整清單</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-headline-md font-bold text-on-surface">${formatPrice(m.avgPrice)}</span>
                        <TrendChip change={m.priceChange} size="sm" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="section-shell">
          <div className="section-heading-row gap-3 mb-5">
            <div>
              <p className="section-kicker">Traceability</p>
              <h3 className="text-headline-md font-semibold text-on-surface">產地追溯摘要</h3>
            </div>
          </div>
          {traceabilityLoading ? (
            <SkeletonCard />
          ) : traceability.length === 0 ? (
            <div className="py-6 text-center text-on-surface-variant">
              <p className="text-body-md font-semibold text-on-surface">{traceabilityError || '目前查無可用追溯資料'}</p>
              <p className="text-body-sm mt-1">可稍後重試或改查更完整作物名稱</p>
            </div>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {traceability.map((item, index) => (
                <li key={`${item.traceCode}-${index}`} className="glass-card rounded-2xl px-4 py-3">
                  <p className="text-body-md font-semibold text-on-surface">{item.productName}</p>
                  <p className="text-body-sm text-on-surface-variant mt-0.5">
                    生產者：{item.producerName} ｜ 產地：{item.county}
                    {item.mark && <span className="ml-1 text-primary font-medium">｜ {item.mark}</span>}
                  </p>
                  <p className="text-label-sm text-outline mt-1">溯源編號：{item.traceCode} ｜ 來源：{item.sourceSystem}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
