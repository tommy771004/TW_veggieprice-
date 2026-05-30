'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { m, AnimatePresence } from 'framer-motion'
import { SkeletonList } from '@/components/ui/SkeletonCard'
import { ProduceRow } from '@/components/ui/ProduceRow'
import { WeatherRiskCard } from '@/components/ui/WeatherRiskCard'
import { formatPrice, debounce, getCropEmoji, subtractDays, todayISO } from '@/lib/utils'
import type {
  ProducePrice,
  SearchFilters,
  MarketTypeOption,
  MarketRestDay,
  MarketWeatherRiskSummary,
} from '@/lib/types'
import {
  fetchMarketOptions,
  fetchMarketRestDays,
  fetchMarketWeatherRisk,
} from '@/lib/api'
import { getUserPreferences } from '@/lib/preferences'
import { DEFAULT_MARKET, ALL_MARKET_SENTINEL } from '@/lib/constants'

const searchStaggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
}

const searchItemVariant = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 350, damping: 26 },
  },
}

type RangeParams =
  | { kind: 'single'; date: string }
  | { kind: 'range'; startDate: string; endDate: string }

const DATE_RANGES: ReadonlyArray<{ label: string; value: SearchFilters['dateRange'] }> = [
  { label: '今日', value: '1d' },
  { label: '近一週', value: '1w' },
  { label: '近一月', value: '1m' },
]

const SORT_OPTIONS: ReadonlyArray<{ label: string; value: SearchFilters['sortBy'] }> = [
  { label: '預設', value: 'name' },
  { label: '價格 ↑', value: 'price_asc' },
  { label: '價格 ↓', value: 'price_desc' },
  { label: '漲跌幅', value: 'change' },
]

const FALLBACK_MARKET_TYPES: ReadonlyArray<MarketTypeOption> = [
  { value: 'Veg', label: '蔬菜市場', description: '蔬菜批發市場即時行情' },
  { value: 'Fruit', label: '水果市場', description: '水果批發市場即時行情' },
  // { value: 'Flower', label: '花市', description: '花卉批發市場即時行情' },
]

const FALLBACK_MARKETS = [ALL_MARKET_SENTINEL]
const ITEMS_PER_PAGE = 20

function getRangeDates(range: SearchFilters['dateRange']): RangeParams {
  const endDate = todayISO()

  if (range === '1w') {
    return { kind: 'range', startDate: subtractDays(endDate, 6), endDate }
  }

  if (range === '1m') {
    return { kind: 'range', startDate: subtractDays(endDate, 29), endDate }
  }

  return { kind: 'single', date: endDate }
}

export function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams?.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<ProducePrice[]>([])
  const [loading, setLoading] = useState(false)
  const [market, setMarket] = useState(() => {
    if (typeof window !== 'undefined') {
      const prefs = getUserPreferences()
      return searchParams?.get('market') || prefs.preferredMarket || DEFAULT_MARKET
    }
    return searchParams?.get('market') || DEFAULT_MARKET
  })
  const [marketType, setMarketType] = useState<MarketTypeOption['value']>('Veg')
  const [marketTypeOptions, setMarketTypeOptions] = useState<MarketTypeOption[]>([...FALLBACK_MARKET_TYPES])
  const [marketsByType, setMarketsByType] = useState<Record<string, string[]>>({})
  const [marketsList, setMarketsList] = useState<string[]>(FALLBACK_MARKETS)
  const [dateRange, setDateRange] = useState<SearchFilters['dateRange']>('1d')
  const [sortBy, setSortBy] = useState<SearchFilters['sortBy']>('name')
  const [autocomplete, setAutocomplete] = useState<string[]>([])
  const [showPriceFilter, setShowPriceFilter] = useState(false)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [nextRestDay, setNextRestDay] = useState<MarketRestDay | null>(null)
  const [weatherRisk, setWeatherRisk] = useState<MarketWeatherRiskSummary | null>(null)
  const [isHydrating, setIsHydrating] = useState(false)
  const [hasMoreServerData, setHasMoreServerData] = useState(false)
  const [hydrationParams, setHydrationParams] = useState<string>('')
  
  const lastSearchId = useRef(0)

  useEffect(() => {
    let cancelled = false

    const prefs = getUserPreferences()
    const urlMarket = searchParams?.get('market')
    const urlType = searchParams?.get('type')
    const preferredMarket = prefs.preferredMarket
    const preferredMarketType = prefs.preferredMarketType

    fetchMarketOptions().then((meta) => {
      if (cancelled) return

      setMarketTypeOptions(meta.marketTypes)
      setMarketsByType(meta.marketsByType)

      // Determine starting market
      const initialMarket = urlMarket || preferredMarket || DEFAULT_MARKET

      // Find which marketType contains initialMarket, prioritizing urlType or preferredMarketType if set
      let resolvedType: MarketTypeOption['value'] | null = null
      if (urlType && meta.marketsByType[urlType as MarketTypeOption['value']]) {
        resolvedType = urlType as MarketTypeOption['value']
      } else if (preferredMarketType && meta.marketsByType[preferredMarketType]?.includes(initialMarket)) {
        resolvedType = preferredMarketType
      } else {
        for (const [mType, list] of Object.entries(meta.marketsByType)) {
          if (list.includes(initialMarket)) {
            resolvedType = mType as MarketTypeOption['value']
            break
          }
        }
      }

      if (!resolvedType) {
        resolvedType = (preferredMarketType && meta.marketTypes.some((option) => option.value === preferredMarketType))
          ? preferredMarketType
          : meta.defaultMarketType
      }

      setMarketType(resolvedType)

      const list = meta.marketsByType[resolvedType] ?? FALLBACK_MARKETS
      setMarketsList(list)

      if (list.includes(initialMarket)) {
        setMarket(initialMarket)
      } else {
        const fallback = list.includes(meta.defaultMarket) ? meta.defaultMarket : (list.find((name) => name !== '全部市場') ?? list[0] ?? DEFAULT_MARKET)
        setMarket(fallback)
      }
    }).catch(console.error)

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  useEffect(() => {
    let cancelled = false
    const today = todayISO()
    const endDate = subtractDays(today, -45)

    Promise.allSettled([
      fetchMarketRestDays({ market, startDate: today, endDate }),
      fetchMarketWeatherRisk(market),
    ]).then(([restResult, weatherResult]) => {
      if (cancelled) return
      if (restResult.status === 'fulfilled') {
        const next = restResult.value
          .filter((item) => item.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
        setNextRestDay(next)
      } else {
        setNextRestDay(null)
      }

      if (weatherResult.status === 'fulfilled') {
        setWeatherRisk(weatherResult.value)
      } else {
        setWeatherRisk(null)
      }
    })
    return () => { cancelled = true }
  }, [market])

  const doSearch = useMemo(
    () => debounce(async (q: string, mkt: string, mktType: string, range: SearchFilters['dateRange']) => {
      setLoading(true)
      setError('')
      const searchId = ++lastSearchId.current
      try {
        const params = new URLSearchParams()
        if (q) params.set('crop', q)
        if (mkt !== '全部市場') params.set('market', mkt)
        if (mktType) params.set('type', mktType)
        const dateParams = getRangeDates(range)
        if (dateParams.kind === 'single') {
          params.set('date', dateParams.date)
        } else {
          params.set('startDate', dateParams.startDate)
          params.set('endDate', dateParams.endDate)
        }

        const page1Params = new URLSearchParams(params)
        page1Params.set('page', '1')
        page1Params.set('limit', '20')
        page1Params.set('format', 'array')

        const res = await fetch(`/api/prices?${page1Params}`)
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error || '暫時無法取得搜尋結果')
        }

        if (searchId !== lastSearchId.current) return
        
        let data: ProducePrice[] = []
        if (json.keys && Array.isArray(json.data)) {
          data = json.data.map((row: any[]) => {
            const obj: any = {}
            json.keys.forEach((key: string, idx: number) => {
              obj[key] = row[idx]
            })
            return obj
          })
        } else {
          data = (json.data || json) as ProducePrice[]
        }
        
        setResults(data)
        if (q.length >= 1) {
          setAutocomplete([...new Set(data.map((d) => d.cropName).filter((n) => n.includes(q)))].slice(0, 5))
        } else {
          setAutocomplete([])
        }
        setLoading(false)

        if (json.hasNextPage) {
          setHasMoreServerData(true)
          setHydrationParams(params.toString())
        } else {
          setHasMoreServerData(false)
        }
      } catch (err) {
        if (searchId === lastSearchId.current) {
          setResults([])
          setAutocomplete([])
          setError(err instanceof Error ? err.message : '暫時無法取得搜尋結果')
          setLoading(false)
        }
      }
    }, 350),
    []
  )

  const loadRemainingData = async () => {
    if (!hydrationParams) return
    setIsHydrating(true)
    try {
      const searchId = lastSearchId.current
      const r = await fetch(`/api/prices?${hydrationParams}&format=array`)
      if (!r.ok) return
      const json = await r.json()
      
      let fullData: ProducePrice[] = []
      if (json.keys && Array.isArray(json.data)) {
        fullData = json.data.map((row: any[]) => {
          const obj: any = {}
          json.keys.forEach((key: string, idx: number) => {
            obj[key] = row[idx]
          })
          return obj
        })
      } else {
        fullData = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : null)
      }
      
      if (searchId === lastSearchId.current && fullData !== null) {
        setResults(fullData)
        setHasMoreServerData(false)
      }
    } catch(err) {
      console.error(err)
    } finally {
      setIsHydrating(false)
    }
  }

  useEffect(() => { doSearch(query, market, marketType, dateRange) }, [query, market, marketType, dateRange, doSearch])

  // Reset to page 1 whenever results or sort/filter options change
  useEffect(() => { setCurrentPage(1) }, [results, minPrice, maxPrice, sortBy])

  const priceFiltered = useMemo(() => results.filter((item) => {
    const min = parseFloat(minPrice)
    const max = parseFloat(maxPrice)
    if (!isNaN(min) && item.avgPrice < min) return false
    if (!isNaN(max) && item.avgPrice > max) return false
    return true
  }), [results, minPrice, maxPrice])

  const sorted = useMemo(() => priceFiltered.toSorted((a, b) => {
    if (sortBy === 'price_asc') return a.avgPrice - b.avgPrice
    if (sortBy === 'price_desc') return b.avgPrice - a.avgPrice
    if (sortBy === 'change') return (b.priceChange ?? 0) - (a.priceChange ?? 0)
    return a.cropName.localeCompare(b.cropName, 'zh-TW')
  }), [priceFiltered, sortBy])

  const hasPriceFilter = minPrice !== '' || maxPrice !== ''
  const pageCount = Math.ceil(sorted.length / ITEMS_PER_PAGE)
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const activeDateLabel = DATE_RANGES.find((item) => item.value === dateRange)?.label ?? '今日'
  const activeMarketTypeLabel = marketTypeOptions.find((item) => item.value === marketType)?.label ?? '蔬菜市場'


  return (
    <div className="px-section-margin py-6 space-y-4">

      <section className="section-shell space-y-4">
        <div className="section-heading-row gap-3">
          <div>
            <h1 className="text-headline-lg font-black text-on-surface">作物行情搜尋台</h1>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-outline" style={{ fontSize: '1.375rem' }}>search</span>
            </div>
            <input
              suppressHydrationWarning
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setAutocomplete([]) }}
              placeholder="搜尋作物名稱… (支援注音輸入)"
              aria-label="搜尋作物"
              autoComplete="off"
              className="w-full bg-white/80 dark:bg-zinc-800/85 dark:text-zinc-100 dark:border-zinc-700/80 border border-white/40 shadow-sm rounded-full py-3 pl-12 pr-12 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-[background-color,box-shadow] backdrop-blur-md"
            />
            <button
              onClick={() => setShowPriceFilter(!showPriceFilter)}
              className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-colors ${
                hasPriceFilter ? 'text-primary' : 'text-primary-container'
              }`}
              title="價格區間篩選"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.375rem' }}>
                {hasPriceFilter ? 'filter_alt' : 'tune'}
              </span>
            </button>

            {autocomplete.length > 0 && (
              <div className="absolute top-full mt-2 w-full glass-card-solid rounded-2xl overflow-hidden z-10 shadow-glass">
                {autocomplete.map((name) => (
                  <button
                    key={name}
                    onClick={() => { setQuery(name); setAutocomplete([]) }}
                    className="w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container transition-colors flex items-center gap-3"
                  >
                    <span className="text-xl">{getCropEmoji(name)}</span>
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Price Range Panel */}
      {showPriceFilter && (
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-label-bold font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '1.125rem' }}>price_change</span>
              價格區間篩選 (元/公斤)
            </h3>
            {hasPriceFilter && (
              <button
                onClick={() => { setMinPrice(''); setMaxPrice('') }}
                className="text-label-bold text-outline hover:text-on-surface transition-colors"
              >
                清除
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label htmlFor="min-price" className="text-body-sm text-on-surface-variant mb-1 block">最低價格</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-body-sm">$</span>
                <input
                  suppressHydrationWarning
                  id="min-price"
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full bg-white/60 dark:bg-zinc-800/80 dark:text-zinc-100 dark:border-zinc-700/80 border border-outline-variant/40 rounded-xl py-2 pl-7 pr-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-[background-color,box-shadow]"
                />
              </div>
            </div>
            <span className="text-outline mt-5">—</span>
            <div className="flex-1">
              <label htmlFor="max-price" className="text-body-sm text-on-surface-variant mb-1 block">最高價格</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-body-sm">$</span>
                <input
                  suppressHydrationWarning
                  id="max-price"
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="999"
                  min="0"
                  className="w-full bg-white/60 dark:bg-zinc-800/80 dark:text-zinc-100 dark:border-zinc-700/80 border border-outline-variant/40 rounded-xl py-2 pl-7 pr-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-[background-color,box-shadow]"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: '20 元以下', min: '', max: '20' },
              { label: '20–50 元', min: '20', max: '50' },
              { label: '50–100 元', min: '50', max: '100' },
              { label: '100 元以上', min: '100', max: '' },
            ].map((preset) => (
              <m.button
                key={preset.label}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => { setMinPrice(preset.min); setMaxPrice(preset.max) }}
                className={`text-label-bold px-3 py-1.5 rounded-full border transition-colors ${
                  minPrice === preset.min && maxPrice === preset.max
                    ? 'bg-primary text-on-primary border-primary shadow-sm ring-1 ring-primary'
                    : 'bg-white/50 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700/60 border-outline-variant/30 text-on-surface-variant hover:bg-white/70 dark:hover:bg-zinc-700/80'
                }`}
              >
                {preset.label}
              </m.button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Chips */}
      <div className="section-shell flex !overflow-x-auto no-scrollbar pb-2">
        <div className="flex gap-2 w-max items-center">
          {marketTypeOptions.map((opt) => (
            <m.button
              key={opt.value}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => {
                const nextType = opt.value as MarketTypeOption['value']
                setMarketType(nextType)
                const metaMarkets = marketsByType[nextType]
                if (metaMarkets) {
                  setMarketsList(metaMarkets)
                  if (!metaMarkets.includes(market)) {
                    const prefs = typeof window !== 'undefined' ? getUserPreferences() : null
                    const preferredMarket = prefs?.preferredMarket
                    const nextMarket = (preferredMarket && metaMarkets.includes(preferredMarket))
                      ? preferredMarket
                      : (metaMarkets.includes(DEFAULT_MARKET) ? DEFAULT_MARKET : metaMarkets[0])
                    setMarket(nextMarket)
                  }
                }
              }}
              className={`px-5 py-2.5 rounded-full text-label-bold whitespace-nowrap flex items-center gap-2 transition-colors touch-target ${
                marketType === opt.value
                  ? 'bg-primary text-white shadow-md'
                  : 'glass-chip text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {opt.label === '蔬菜市場' ? '🥬 蔬菜類' : opt.label === '水果市場' ? '🍎 水果類' : opt.label === '肉品家禽' ? '🐖 肉品家禽' : '🐟 漁產市場'}
            </m.button>
          ))}
          <div className="w-[1px] h-6 bg-outline-variant/50 mx-1 shrink-0"></div>
          <div className="flex items-center gap-1 glass-chip rounded-full px-3 py-2 text-label-bold text-sm whitespace-nowrap">
            <span className="material-symbols-outlined text-outline" aria-hidden="true" style={{ fontSize: '1rem' }}>store</span>
            <select
              suppressHydrationWarning
              aria-label="選擇市場"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="bg-transparent text-primary-container font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
            >
              {marketsList.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div className="w-[1px] h-6 bg-outline-variant/50 mx-1 shrink-0"></div>

          {DATE_RANGES.map((d) => (
          <button
            key={d.value}
            onClick={() => setDateRange(d.value)}
            className={`flex items-center gap-1 px-4 py-2 rounded-full text-label-bold whitespace-nowrap backdrop-blur-sm border transition-colors touch-target ${
              dateRange === d.value
                ? 'bg-primary-container/10 border-primary-container/20 text-primary-container'
                : 'bg-white/50 border-outline-variant/30 text-on-surface-variant hover:bg-white/60'
            }`}
          >
            {d.label}
          </button>
        ))}

        <div className="flex items-center gap-1 glass-chip rounded-full px-3 py-2 text-label-bold text-sm whitespace-nowrap">
          <span className="material-symbols-outlined text-outline" aria-hidden="true" style={{ fontSize: '1rem' }}>sort</span>
          <select
            suppressHydrationWarning
            aria-label="排序方式"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SearchFilters['sortBy'])}
            className="bg-transparent text-primary-container font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
          >
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="result-meta-bar">
        <p className="text-body-sm text-on-surface-variant">
          {loading ? '搜尋中…' : error ? '目前無法載入搜尋結果' : `共 ${sorted.length} 筆結果${pageCount > 1 ? `，第 ${currentPage}/${pageCount} 頁` : ''}`}
          {hasPriceFilter && !loading && (
            <span className="ml-2 text-primary font-medium">
              (${minPrice || '0'} – ${maxPrice || '∞'} 元)
            </span>
          )}
        </p>
        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setAutocomplete([]) }}
            className="text-label-bold text-outline hover:text-on-surface transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
            清除
          </button>
        )}
      </div>

      {/* Results List */}
      {loading ? (
        <SkeletonList count={6} className="grid grid-cols-1 md:grid-cols-2 gap-3" />
      ) : (
        <m.div
          key={`${currentPage}-${market}-${marketType}-${query}`}
          variants={searchStaggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {error && (
            <div className="glass-card-solid rounded-2xl px-4 py-5 text-center text-on-surface-variant md:col-span-2">
              <div className="text-4xl mb-2">🧺</div>
              <p className="text-body-lg font-semibold text-on-surface">系統維護中或資料暫時無法取得</p>
              <p className="text-body-sm mt-1">{error}</p>
              <m.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => doSearch(query, market, marketType, dateRange)}
                className="mt-4 text-primary text-label-bold hover:underline"
              >
                重新載入
              </m.button>
            </div>
          )}

          {paginated.map((item, index) => (
            <m.div
              key={`${item.cropCode}-${item.marketName}-${item.date}-${index}`}
              variants={searchItemVariant}
              layout
            >
              <ProduceRow item={{...item, emoji: getCropEmoji(item.cropName)}} showDetails={true} />
            </m.div>
          ))}

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2 pb-1 md:col-span-2">
              <m.button
                whileHover={currentPage === 1 ? {} : { scale: 1.02 }}
                whileTap={currentPage === 1 ? {} : { scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-full text-label-bold border transition-[background-color,opacity] disabled:opacity-30 disabled:cursor-not-allowed bg-white/50 border-outline-variant/30 text-on-surface-variant hover:bg-white/70"
              >
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.125rem' }}>chevron_left</span>
                上一頁
              </m.button>
              <div className="flex gap-1">
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pageCount || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, idx) =>
                    p === 'ellipsis' ? (
                      <span key={`e-${idx}`} className="px-2 py-2 text-on-surface-variant">…</span>
                    ) : (
                      <m.button
                        key={p}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        onClick={() => setCurrentPage(p as number)}
                        className={`w-9 h-9 rounded-full text-label-bold border transition-[background-color,color,border-color] ${
                          currentPage === p
                             ? 'bg-primary-container/10 border-primary-container/30 text-primary-container'
                             : 'bg-white/50 border-outline-variant/30 text-on-surface-variant hover:bg-white/70'
                        }`}
                      >
                        {p}
                      </m.button>
                    )
                  )}
              </div>
              <m.button
                whileHover={currentPage === pageCount ? {} : { scale: 1.02 }}
                whileTap={currentPage === pageCount ? {} : { scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage === pageCount}
                className="flex items-center gap-1 px-4 py-2 rounded-full text-label-bold border transition-[background-color,opacity] disabled:opacity-30 disabled:cursor-not-allowed bg-white/50 border-outline-variant/30 text-on-surface-variant hover:bg-white/70"
              >
                下一頁
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.125rem' }}>chevron_right</span>
              </m.button>
            </div>
          )}

          {hasMoreServerData && (
            <div className="flex justify-center pt-4 pb-2 md:col-span-2">
              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={loadRemainingData}
                disabled={isHydrating}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-label-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {isHydrating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin block"></span>
                    正在載入全部資料…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>download</span>
                    載入其餘相符資料
                  </>
                )}
              </m.button>
            </div>
          )}

          {sorted.length === 0 && !loading && !error && (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl block mb-3">search_off</span>
              {query ? (
                <>
                  <p className="text-body-lg">找不到「{query}」的相關結果</p>
                  <p className="text-body-sm mt-1">請嘗試其他關鍵字，或清除篩選條件</p>
                </>
              ) : hasPriceFilter ? (
                <>
                  <p className="text-body-lg">此價格區間無資料</p>
                  <p className="text-body-sm mt-1">請調整價格範圍後再試</p>
                </>
              ) : (
                <p className="text-body-lg">輸入關鍵字以搜尋作物</p>
              )}
            </div>
          )}
        </m.div>
      )}
    </div>
  )
}