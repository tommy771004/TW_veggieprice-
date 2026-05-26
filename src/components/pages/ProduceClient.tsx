'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { TrendChip } from '@/components/ui/TrendChip'
import { PriceLineChart } from '@/components/charts/PriceLineChart'
import { VolumeBarChart } from '@/components/charts/VolumeBarChart'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { formatPrice, getCropEmoji } from '@/lib/utils'
import { toggleWatchlist, isInWatchlist } from '@/lib/watchlist'
import { getProduceCategory } from '@/lib/produce'
import type {
  PricePeriod,
  MarketComparison,
  PriceHistoryPoint,
  HistoryApiResponse,
  TraceabilitySummaryItem,
  ProductCostInsight,
  CostSurveyFile,
  CropInfo,
} from '@/lib/types'
import Link from 'next/link'

const PERIODS: PricePeriod[] = ['1W', '1M', '3M']

export function ProduceClient({ cropName }: { cropName: string }) {
  const router = useRouter()
  const emoji = getCropEmoji(cropName)

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

  // Fetch History
  useEffect(() => {
    let active = true

    async function loadHistory() {
      setHistoryLoading(true)
      setHistoryError('')
      setStreamingStatus('idle')
      setStreamingProgress(0)
      setStreamingTotal(0)

      function getDaysAgoISO(days: number): string {
        const d = new Date()
        d.setDate(d.getDate() - days)
        return d.toISOString().split('T')[0]
      }

      const todayStr = getDaysAgoISO(0)

      try {
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
    async function loadMarkets() {
      setMarketsLoading(true)
      setMarketsError('')
      try {
        const mRes = await fetch(`/api/prices/markets?crop=${encodeURIComponent(cropName)}`)
        const marketsJson = await mRes.json()
        if (mRes.ok) {
          setMarkets(marketsJson)
        } else {
          setMarkets([])
          setMarketsError(marketsJson.error || '目前無法載入市場比價資料')
        }
      } catch {
        setMarkets([])
        setMarketsError('目前無法載入市場比價資料')
      } finally {
        setMarketsLoading(false)
      }
    }
    loadMarkets()
  }, [cropName, reloadKey])

  // Fetch Traceability
  useEffect(() => {
    async function loadTraceability() {
      setTraceabilityLoading(true)
      setTraceabilityError('')
      try {
        const traceRes = await fetch(`/api/prices/traceability?crop=${encodeURIComponent(cropName)}&limit=5`)
        const traceJson = await traceRes.json()
        if (traceRes.ok) {
          setTraceability((traceJson.items ?? []) as TraceabilitySummaryItem[])
        } else {
          setTraceability([])
          setTraceabilityError(traceJson.error || '目前無法取得追溯資料')
        }
      } catch {
        setTraceability([])
        setTraceabilityError('目前無法取得追溯資料')
      } finally {
        setTraceabilityLoading(false)
      }
    }
    loadTraceability()
  }, [cropName, reloadKey])

  // Fetch Cost
  useEffect(() => {
    async function loadCost() {
      setCostLoading(true)
      setCostError('')
      try {
        const costRes = await fetch(`/api/prices/cost?crop=${encodeURIComponent(cropName)}`)
        const costJson = await costRes.json()
        if (costRes.ok) {
          setCostInsight((costJson.insight ?? null) as ProductCostInsight | null)
          setCostFiles((costJson.insight?.costFiles ?? []) as CostSurveyFile[])
        } else {
          setCostInsight(null)
          setCostFiles([])
          setCostError(costJson.error || '目前無法取得成本資料')
        }
      } catch {
        setCostInsight(null)
        setCostFiles([])
        setCostError('目前無法取得成本資料')
      } finally {
        setCostLoading(false)
      }
    }
    loadCost()
  }, [cropName, reloadKey])

  // Fetch Crop Info
  useEffect(() => {
    async function loadInfo() {
      setInfoLoading(true)
      try {
        const infoRes = await fetch(`/api/produce/info?crop=${encodeURIComponent(cropName)}`)
        const infoJson = await infoRes.json()
        setCropInfo(infoRes.ok
          ? (infoJson as CropInfo)
          : { feature: '天然新鮮農產品', season: '全年供應', origin: '台灣各地' }
        )
      } catch {
        setCropInfo({ feature: '天然新鮮農產品', season: '全年供應', origin: '台灣各地' })
      } finally {
        setInfoLoading(false)
      }
    }
    loadInfo()
  }, [cropName, reloadKey])

  useEffect(() => {
    async function fetchWeather(origin: string) {
      if (!origin || origin === '台灣各地') return
      setWeatherLoading(true)
      setWeatherError('')
      setWeather(null)
      try {
        const res = await fetch(`/api/weather?county=${encodeURIComponent(origin)}`)
        const json = await res.json()
        if (res.ok) {
          setWeather(json as WeatherData)
        } else {
          setWeatherError(json.error || '無法取得氣象資料')
        }
      } catch (err) {
        setWeatherError('取得氣象資料失敗')
      } finally {
        setWeatherLoading(false)
      }
    }
    
    if (cropInfo?.origin) {
      fetchWeather(cropInfo.origin)
    }
  }, [cropInfo?.origin])

  const validHistory = history.filter((point): point is PriceHistoryPoint & { avgPrice: number } => point.avgPrice !== null)
  const latestPrice = validHistory[validHistory.length - 1]?.avgPrice ?? 0
  const prevPrice = validHistory[validHistory.length - 2]?.avgPrice ?? latestPrice
  const priceChange = prevPrice ? ((latestPrice - prevPrice) / prevPrice) * 100 : 0
  const avgCost = costInsight?.avgCostPerKg ?? null
  const costGap = avgCost !== null && latestPrice > 0 ? latestPrice - avgCost : null
  const compareMax = Math.max(latestPrice, avgCost ?? 0, 1)

  // Whether the loaded history dataset includes upper/lower price columns
  const hasHistoryRangeData = history.some((d) => d.upperPrice != null)
  const [showPriceRange, setShowPriceRange] = useState(false)

  function handleToggleWatchlist() {
    const added = toggleWatchlist({ cropCode, cropName, emoji })
    setInWatchlist(added)
  }

  return (
    <div className="pb-8">
      {/* Header bar */}
      <div className="flex justify-between items-center px-6 py-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <button
          onClick={handleToggleWatchlist}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
        >
          <span
            className={`material-symbols-outlined text-2xl ${inWatchlist ? 'text-error' : 'text-outline'}`}
            style={{ fontVariationSettings: inWatchlist ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
        </button>
      </div>

      <div className="px-section-margin space-y-section-margin">

        {/* Crop Info & Price */}
        <GlassCard solid className="rounded-3xl p-container-padding flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-surface-container-high flex items-center justify-center text-5xl mb-4 border border-outline-variant">
            {emoji}
          </div>
          <h2 className="text-headline-lg font-bold text-on-surface mb-1">{cropName}</h2>
          {updatedAt && (
            <p className="text-label-sm text-on-surface-variant flex items-center justify-center gap-1 mb-1">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>update</span>
              最後更新：{new Date(updatedAt).toLocaleString('zh-TW', {
                month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          )}
          <p className="text-label-bold text-outline uppercase tracking-widest mb-6">
            {cropName.replace(/（.*）|\(.*\)/g, '').trim()}
          </p>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-label-bold text-on-surface-variant">$</span>
            <span className="text-display-price font-bold text-primary">{latestPrice > 0 ? formatPrice(latestPrice) : '--'}</span>
            <span className="text-label-bold text-on-surface-variant">/ kg</span>
          </div>
          {latestPrice > 0 ? (
            <TrendChip change={priceChange} />
          ) : (
            <p className="text-body-sm text-on-surface-variant">目前沒有足夠資料計算漲跌</p>
          )}
        </GlassCard>

        {/* Price Chart */}
        <GlassCard className="rounded-3xl p-container-padding">
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-headline-md font-semibold text-on-surface">價格趨勢</h3>
              {streamingStatus === 'loading_chunks' && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[0.6875rem] font-medium animate-pulse self-start transition-opacity duration-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>串流載入歷史中... ({streamingProgress}/{streamingTotal})</span>
                </div>
              )}
              {hasHistoryRangeData && (
                <button
                  onClick={() => setShowPriceRange((v) => !v)}
                  className={`inline-flex items-center gap-1 self-start px-2.5 py-0.5 rounded-full text-[0.6875rem] font-medium transition-colors ${
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
            <div className="skeleton h-48 rounded-xl" />
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-on-surface-variant gap-3">
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
            <PriceLineChart data={history} closedDays={closedDays} height={180} showPriceRange={showPriceRange} />
          )}
        </GlassCard>

        {/* Volume Chart */}
        <GlassCard className="rounded-3xl p-container-padding">
          <h3 className="text-headline-md font-semibold text-on-surface mb-4">交易量 (公斤)</h3>
          {historyLoading ? (
            <div className="skeleton h-28 rounded-xl" />
          ) : validHistory.length === 0 ? (
            <div className="h-28 flex items-center justify-center text-body-sm text-on-surface-variant">
              目前沒有可顯示的交易量資料
            </div>
          ) : (
            <VolumeBarChart data={history.slice(-14)} height={120} />
          )}
        </GlassCard>

        {/* Crop Info */}
        <GlassCard className="rounded-3xl p-container-padding">
          <h3 className="text-headline-md font-semibold text-on-surface mb-4">作物簡介</h3>
          {infoLoading || !cropInfo ? (
            <SkeletonCard />
          ) : (
            <div className="space-y-4">
              {[
                { icon: 'info', label: '特徵', value: cropInfo.feature },
                { icon: 'calendar_month', label: '產季', value: cropInfo.season },
                { icon: 'location_on', label: '主要產地', value: cropInfo.origin },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: '1.25rem' }}>{row.icon}</span>
                  <div>
                    <h4 className="text-label-bold text-on-surface-variant">{row.label}</h4>
                    <p className="text-body-md text-on-surface">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Origin Weather */}
        {cropInfo?.origin && cropInfo.origin !== '台灣各地' && (
          <GlassCard className="rounded-3xl p-container-padding">
            <h3 className="text-headline-md font-semibold text-on-surface mb-4">產地氣象 ({weather?.county || cropInfo.origin.split('、')[0]})</h3>
            {weatherLoading ? (
              <div className="skeleton h-24 rounded-xl" />
            ) : weatherError ? (
              <div className="flex flex-col items-center justify-center p-4 text-on-surface-variant gap-2">
                <span className="material-symbols-outlined text-3xl">cloud_off</span>
                <p className="text-body-md">{weatherError}</p>
              </div>
            ) : weather ? (
              <div className="flex justify-between items-center bg-surface-container rounded-2xl p-4 border border-outline-variant">
                  <div className="flex flex-col items-center flex-1">
                    <span className="material-symbols-outlined text-primary mb-1">device_thermostat</span>
                    <span className="text-label-bold text-on-surface-variant">溫度</span>
                    <span className="text-title-lg font-bold text-on-surface">
                      {weather.temp !== null ? `${weather.temp}°C` : '--'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-outline-variant mx-2"></div>
                  <div className="flex flex-col items-center flex-1">
                    <span className="material-symbols-outlined text-primary mb-1">rainy</span>
                    <span className="text-label-bold text-on-surface-variant">日雨量</span>
                    <span className="text-title-lg font-bold text-on-surface">
                      {weather.rainfall !== null ? `${weather.rainfall}mm` : '--'}
                    </span>
                  </div>
                  <div className="w-px h-12 bg-outline-variant mx-2"></div>
                  <div className="flex flex-col items-center flex-1">
                    <span className="material-symbols-outlined text-primary mb-1">humidity_percentage</span>
                    <span className="text-label-bold text-on-surface-variant">濕度</span>
                    <span className="text-title-lg font-bold text-on-surface">
                      {weather.humidity !== null ? `${weather.humidity}%` : '--'}
                    </span>
                  </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-on-surface-variant gap-2">
                <span className="material-symbols-outlined text-3xl">cloud_off</span>
                <p className="text-body-md">查無產地氣象</p>
              </div>
            )}
          </GlassCard>
        )}

        {/* Traceability Summary */}
        <GlassCard className="rounded-3xl p-container-padding">
          <h3 className="text-headline-md font-semibold text-on-surface mb-4">產地追溯摘要</h3>
          {traceabilityLoading ? (
            <SkeletonCard />
          ) : traceability.length === 0 ? (
            <div className="py-6 text-center text-on-surface-variant">
              <p className="text-body-md font-semibold text-on-surface">{traceabilityError || '目前查無可用追溯資料'}</p>
              <p className="text-body-sm mt-1">可稍後重試或改查更完整作物名稱</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {traceability.map((item, index) => (
                <li key={`${item.traceCode}-${index}`} className="rounded-2xl bg-white/60 border border-white/70 px-4 py-3">
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
        </GlassCard>

        {/* Cost vs Price */}
        <GlassCard className="rounded-3xl p-container-padding">
          <h3 className="text-headline-md font-semibold text-on-surface mb-4">成本與行情對照</h3>
          {costLoading ? (
            <SkeletonCard />
          ) : costInsight && avgCost !== null ? (
            <div className="space-y-3">
              <div className="space-y-2">
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

              <div className="rounded-2xl border border-outline-variant/30 bg-white/60 px-4 py-3">
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
                  <li key={index} className="rounded-2xl bg-white/60 border border-white/70 px-4 py-3 flex items-center justify-between gap-3">
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
        </GlassCard>

        {/* Market Comparison */}
        <GlassCard className="rounded-3xl p-container-padding">
          <h3 className="text-headline-md font-semibold text-on-surface mb-4">各區市場比價</h3>
          {marketsLoading ? (
            <SkeletonCard />
          ) : markets.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant">
              <p className="text-body-md font-semibold text-on-surface">{marketsError || '目前沒有市場比價資料'}</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {markets.map((m) => (
                <li key={m.marketName} className="border-b border-surface-variant last:border-0 hover:bg-white/40 transition-colors">
                  <Link 
                    href={`/search?q=${encodeURIComponent(cropName)}&market=${encodeURIComponent(m.marketName)}&type=${
                      (() => {
                        const cat = getProduceCategory(cropName)
                        return cat === 'fruit' ? 'Fruit' : 'Veg'
                      })()
                    }`}
                    className="flex justify-between items-center py-2.5 px-2 block"
                  >
                    <span className="text-body-lg text-on-surface hover:text-primary transition-colors">{m.marketName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-headline-md font-bold text-on-surface">${formatPrice(m.avgPrice)}</span>
                      <TrendChip change={m.priceChange} size="sm" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

      </div>
    </div>
  )
}
