import { unstable_cache } from 'next/cache'
import { dateLabel, dateRange, isoToROC, periodToDays, rocToISO, subtractDays, todayISO } from '@/lib/server/dateUtils'
import type {
  ProducePrice,
  LivestockPrices,
  SeasonalItem,
  TraceabilitySummaryItem,
  ProductCostInsight,
  CostSurveyFile,
} from '@/lib/types'
import { CROP_DESCRIPTIONS, getProduceCategory } from '@/lib/produce'
import { getCropEmoji } from '@/lib/utils'
import {
  resolveCountyFromMarketName as resolveCountyFromMarketDataset,
} from '@/lib/server/marketCountyMap'
import { DEFAULT_MARKET, ALL_MARKET_SENTINEL } from '@/lib/constants'

const MOA_BASE = process.env.MOA_API_BASE_URL ?? 'https://data.moa.gov.tw/api/v1/AgriProductsTransType/'
const MOA_API_ROOT = process.env.MOA_API_ROOT_URL ?? 'https://data.moa.gov.tw/api/v1'
const FETCH_TIMEOUT_MS = Number(process.env.MOA_FETCH_TIMEOUT_MS ?? '10000')

const MARKET_TYPE_OPTIONS = [
  { value: 'Veg', label: '蔬菜市場', description: '蔬菜批發市場即時行情' },
  { value: 'Fruit', label: '水果市場', description: '水果批發市場即時行情' },
  { value: 'ComVegFruit', label: '綜合蔬果', description: '綜合蔬果交易市場行情' },
] as const

type MarketType = (typeof MARKET_TYPE_OPTIONS)[number]['value']

function normalizeMarketType(input: string): MarketType {
  return MARKET_TYPE_OPTIONS.some((option) => option.value === input)
    ? (input as MarketType)
    : 'Veg'
}

export interface MarketTypeOption {
  value: MarketType
  label: string
  description: string
}

export interface MarketOptionsResult {
  marketTypes: MarketTypeOption[]
  marketsByType: Record<MarketType, string[]>
  defaultMarketType: MarketType
  defaultMarket: string
  dateRanges: Array<{ label: string; value: '1d' | '1w' | '1m' }>
  pricePeriods: Array<'1W' | '1M' | '3M' | '1Y'>
  source: string
  updatedAt: string
  error?: string
}

export interface MarketRestDay {
  marketName: string
  date: string
  note?: string
}

export interface MarketRestDayResult {
  items: MarketRestDay[]
  error?: string
}

export interface MarketWeatherObservation {
  stationName: string
  county: string
  observedAt: string
  temperatureC: number | null
  rainfallMm: number | null
  humidityPct: number | null
}

export interface MarketWeatherObservationResult {
  items: MarketWeatherObservation[]
  error?: string
}

interface MOARawRecord {
  MarketName: string
  CropCode: string
  CropName: string
  Upper_Price: number
  Middle_Price: number
  Lower_Price: number
  Avg_Price: number
  Trans_Quantity: number
  TransDate: string
}

export interface NormalizedPriceRecord {
  cropCode: string
  cropName: string
  marketName: string
  grade: string
  upperPrice: number
  middlePrice: number
  lowerPrice: number
  avgPrice: number
  transWeight: number
  date: string
}

export interface HistoryPoint {
  date: string
  label: string
  avgPrice: number | null
  upperPrice: number | null
  lowerPrice: number | null
  volume: number | null
  isClosed: boolean
}

export interface FetchMarketDataResult {
  data: HistoryPoint[]
  closedDays: string[]
  error?: string
}

export interface SearchRecordsResult {
  records: ProducePrice[]
  error?: string
}

export interface MarketOverviewTrendPoint {
  date: string
  label: string
  avgPrice: number | null
  volume: number | null
}

export interface MarketOverviewTrendResult {
  points: MarketOverviewTrendPoint[]
  error?: string
}

interface MarketDailyAggregate {
  priceSum: number
  priceCount: number
  volumeSum: number
  recordCount: number
}

interface PriceQueryOptions {
  cropName?: string
  market?: string
  date?: string
  startDate?: string
  endDate?: string
}

function parseRecord(record: MOARawRecord): NormalizedPriceRecord {
  return {
    cropCode: record.CropCode ?? '',
    cropName: record.CropName ?? '',
    marketName: record.MarketName ?? '',
    grade: '一般',
    upperPrice: record.Upper_Price || 0,
    middlePrice: record.Middle_Price || 0,
    lowerPrice: record.Lower_Price || 0,
    avgPrice: record.Avg_Price || 0,
    transWeight: record.Trans_Quantity || 0,
    date: rocToISO(record.TransDate ?? ''),
  }
}

const MAX_PAGES = 50

function readStringField(record: Record<string, unknown>, candidates: string[]): string {
  for (const field of candidates) {
    const value = record[field]
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }

  return ''
}

function textContainsKeyword(value: string, keyword: string): boolean {
  if (!value || !keyword) return false
  const normalizedValue = value.replace(/\s+/g, '').toLowerCase()
  const normalizedKeyword = keyword.replace(/\s+/g, '').toLowerCase()
  return normalizedValue.includes(normalizedKeyword)
}

function normalizeMoaDate(raw: string): string {
  const value = raw.trim()
  if (!value) return ''

  if (/^\d{3,4}\d{2}\d{2}$/.test(value)) {
    return rocToISO(value)
  }

  if (/^\d{4}[\/.-]\d{2}[\/.-]\d{2}$/.test(value)) {
    return value.replace(/[/.]/g, '-')
  }

  return value
}

function readNumberField(record: Record<string, unknown>, candidates: string[]): number | null {
  for (const field of candidates) {
    const value = record[field]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

function pickCostPerKg(record: Record<string, unknown>): number | null {
  const directCost = readNumberField(record, [
    'CostPerKg',
    'AverageCostPerKg',
    'AvgCostPerKg',
    'UnitCost',
    'Cost',
    'AverageCost',
  ])

  if (directCost !== null && directCost > 0 && directCost < 1000) {
    return directCost
  }

  const totalCost = readNumberField(record, ['TotalCost', 'ProductionCost', 'CostTotal'])
  const quantity = readNumberField(record, ['YieldKg', 'QuantityKg', 'ProductionQuantityKg'])

  if (totalCost !== null && quantity !== null && totalCost > 0 && quantity > 0) {
    const derived = totalCost / quantity
    if (Number.isFinite(derived) && derived > 0 && derived < 1000) {
      return derived
    }
  }

  return null
}

async function fetchMOARecords(params: URLSearchParams, maxPages: number = MAX_PAGES): Promise<MOARawRecord[]> {
  const allRecords: MOARawRecord[] = []
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    for (let page = 1; page <= maxPages; page++) {
      const pageParams = new URLSearchParams(params)
      if (page > 1) {
        pageParams.set('page', String(page))
      }

      const response = await fetch(`${MOA_BASE}?${pageParams}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`MOA returned HTTP ${response.status}`)
      }

      const json = await response.json() as { Data: MOARawRecord[]; Next: boolean }
      const records = json.Data ?? []
      allRecords.push(...records)

      if (!json.Next || records.length === 0) {
        break
      }
    }
  } finally {
    clearTimeout(timer)
  }

  return allRecords
}

async function fetchMOAEndpointRecords<T extends object>(
  endpoint: string,
  params: URLSearchParams,
  maxPages: number = MAX_PAGES
): Promise<T[]> {
  const allRecords: T[] = []
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    for (let page = 1; page <= maxPages; page++) {
      const pageParams = new URLSearchParams(params)
      if (page > 1) {
        pageParams.set('page', String(page))
      }

      const response = await fetch(`${MOA_API_ROOT}/${endpoint}/?${pageParams}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`MOA ${endpoint} returned HTTP ${response.status}`)
      }

      const json = await response.json() as { Data?: T[]; Next?: boolean }
      const records = json.Data ?? []
      allRecords.push(...records)

      if (!json.Next || records.length === 0) {
        break
      }
    }
  } finally {
    clearTimeout(timer)
  }

  return allRecords
}

export interface MOAMarket {
  MarketCode: string;
  MarketName: string;
}

const fetchMarketsCached = unstable_cache(
  async (type: string): Promise<string[]> => {
    const allMarkets = new Set<string>()
    allMarkets.add('全部市場')
    const normalizedType = normalizeMarketType(type)
    const params = new URLSearchParams({ CropMarketType: normalizedType })
    const records = await fetchMOAEndpointRecords<MOAMarket>('CropMarketType', params, 2)
    for (const record of records) {
      if (record.MarketName) {
        allMarkets.add(record.MarketName)
      }
    }
    return Array.from(allMarkets)
  },
  ['moa-markets-list-v1'],
  { revalidate: 3600 }
)

export async function fetchMarkets(type: string = 'Veg'): Promise<string[]> {
  try {
    return await fetchMarketsCached(type)
  } catch (error) {
    console.error('Failed to fetch markets', error)
    return ['全部市場']
  }
}

const fetchMarketOptionsCached = unstable_cache(
  async (): Promise<MarketOptionsResult> => {
    const entries = await Promise.all(
      MARKET_TYPE_OPTIONS.map(async (option) => {
        const markets = await fetchMarkets(option.value)
        return [option.value, markets] as const
      })
    )

    const marketsByType = Object.fromEntries(entries) as Record<MarketType, string[]>
    const vegMarkets = marketsByType.Veg ?? [ALL_MARKET_SENTINEL]
    const defaultMarket = vegMarkets.includes(DEFAULT_MARKET)
      ? DEFAULT_MARKET
      : (vegMarkets.find((market) => market !== ALL_MARKET_SENTINEL) ?? ALL_MARKET_SENTINEL)

    return {
      marketTypes: [...MARKET_TYPE_OPTIONS],
      marketsByType,
      defaultMarketType: 'Veg',
      defaultMarket,
      dateRanges: [
        { label: '今日', value: '1d' },
        { label: '近一週', value: '1w' },
        { label: '近一月', value: '1m' },
      ],
      pricePeriods: ['1W', '1M', '3M', '1Y'],
      source: 'https://data.moa.gov.tw/api.aspx',
      updatedAt: new Date().toISOString(),
    }
  },
  ['moa-market-options-v1'],
  { revalidate: 3600 }
)

export async function fetchMarketOptions(): Promise<MarketOptionsResult> {
  try {
    return await fetchMarketOptionsCached()
  } catch (error) {
    return {
      marketTypes: [...MARKET_TYPE_OPTIONS],
      marketsByType: {
        Veg: ['全部市場'],
        Fruit: ['全部市場'],
        ComVegFruit: ['全部市場'],
      },
      defaultMarketType: 'Veg',
      defaultMarket: '全部市場',
      dateRanges: [
        { label: '今日', value: '1d' },
        { label: '近一週', value: '1w' },
        { label: '近一月', value: '1m' },
      ],
      pricePeriods: ['1W', '1M', '3M', '1Y'],
      source: 'https://data.moa.gov.tw/api.aspx',
      updatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown MOA fetch error',
    }
  }
}

export async function fetchMarketRestDays(
  market: string,
  startDate: string,
  endDate: string
): Promise<MarketRestDayResult> {
  const params = new URLSearchParams({
    Start_time: isoToROC(startDate),
    End_time: isoToROC(endDate),
  })

  if (market && market !== '全部市場') {
    params.set('MarketName', market)
  }

  try {
    const records = await fetchMOAEndpointRecords<Record<string, unknown>>('MarketRestDayFarmWCF', params, 4)
    const seen = new Set<string>()
    const items: MarketRestDay[] = []

    for (const record of records) {
      const marketName = readStringField(record, ['MarketName', 'marketName', 'Market'])
      const rawDate = readStringField(record, ['RestDate', 'MarketDate', 'TransDate', 'Date'])
      const date = normalizeMoaDate(rawDate)
      const note = readStringField(record, ['Remark', 'Note', 'Memo', 'Reason'])

      if (!marketName || !date) continue
      if (market && market !== '全部市場' && marketName !== market) continue

      const key = `${marketName}_${date}`
      if (seen.has(key)) continue
      seen.add(key)

      items.push({ marketName, date, note: note || undefined })
    }

    items.sort((a, b) => a.date.localeCompare(b.date) || a.marketName.localeCompare(b.marketName, 'zh-TW'))
    return { items }
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : 'Unknown MOA fetch error',
    }
  }
}

function parseWeatherRecord(record: Record<string, unknown>, rainfallOnly: boolean): MarketWeatherObservation {
  return {
    stationName: readStringField(record, ['StationName', 'SiteName', 'Station', 'Station_name']),
    county: readStringField(record, ['CountyName', 'County', 'City', 'CITY']),
    observedAt: normalizeMoaDate(readStringField(record, ['ObserveTime', 'ObsTime', 'DataDate', 'TransDate', 'TIME'])),
    temperatureC: rainfallOnly ? null : readNumberField(record, ['AirTemperature', 'Temperature', 'TEMP']),
    rainfallMm: readNumberField(record, ['DailyRainfall', 'Rainfall', 'RAIN', 'Precipitation', 'H_24R']),
    humidityPct: rainfallOnly ? null : readNumberField(record, ['RelativeHumidity', 'Humidity', 'RH', 'HUMD']),
  }
}

// Fetches weather + dedicated rainfall station data for a specific county.
// Filtered at the API level (CITY param) instead of post-fetching all stations globally.
const fetchWeatherObservationsByCountyCached = unstable_cache(
  async (county: string): Promise<MarketWeatherObservation[]> => {
    const params = new URLSearchParams()
    if (county) params.set('CITY', county)

    const [weatherRecords, rainfallRecords] = await Promise.all([
      fetchMOAEndpointRecords<Record<string, unknown>>('AutoWeatherStationType', params, 2),
      fetchMOAEndpointRecords<Record<string, unknown>>('AutoRainfallStationType', params, 2),
    ])

    return [
      ...weatherRecords.map((r) => parseWeatherRecord(r, false)),
      ...rainfallRecords.map((r) => parseWeatherRecord(r, true)),
    ].filter((item) => item.stationName)
  },
  ['moa-weather-by-county-v2'],
  { revalidate: 900 }
)

export async function fetchMarketWeatherObservations(
  county: string,
  limit: number = 20
): Promise<MarketWeatherObservationResult> {
  try {
    const normalizedLimit = Math.max(1, Math.min(Math.floor(limit), 100))
    const items = await fetchWeatherObservationsByCountyCached(county)
    return { items: items.slice(0, normalizedLimit) }
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : 'Unknown MOA fetch error',
    }
  }
}

export function resolveCountyFromMarketName(marketName: string): string {
  return resolveCountyFromMarketDataset(marketName)
}

const fetchTraceabilitySummaryCached = unstable_cache(
  async (cropName: string, limit: number): Promise<TraceabilitySummaryItem[]> => {
    const endpoints = ['TWAgriProductsTraceabilityType_ProductInfo', 'AgriProductsTraceabilityType']
    const variants: Array<{ query: Record<string, string>; maxPages: number; fallback?: boolean }> = [
      { query: { Product: cropName }, maxPages: 2 },
      { query: { ProductName: cropName }, maxPages: 2 },
      { query: { CropName: cropName }, maxPages: 2 },
      { query: { Keyword: cropName }, maxPages: 2 },
      // Unfiltered fallback can be expensive. Only use it as a last resort.
      { query: {}, maxPages: 1, fallback: true },
    ]

    const records: Array<Record<string, unknown> & { __source?: string }> = []

    for (const endpoint of endpoints) {
      for (const variant of variants) {
        if (variant.fallback && records.length > 0) {
          continue
        }

        const params = new URLSearchParams()
        Object.entries(variant.query).forEach(([key, value]) => params.set(key, value))
        let batch: Record<string, unknown>[] = []
        try {
          batch = await fetchMOAEndpointRecords<Record<string, unknown>>(endpoint, params, variant.maxPages)
        } catch {
          // Keep trying other endpoints/parameter variants instead of failing whole API.
          continue
        }
        if (batch.length === 0) continue

        records.push(...batch.map((item) => ({ ...item, __source: endpoint })))

        const enough = records.filter((record) => {
          const product = readStringField(record, ['Product', 'ProductName', 'CropName', '品名', '作物名稱'])
          return textContainsKeyword(product, cropName)
        }).length >= limit

        if (enough) break
      }

      const matchedCount = records.filter((record) => {
        const product = readStringField(record, ['Product', 'ProductName', 'CropName', '品名', '作物名稱'])
        return textContainsKeyword(product, cropName)
      }).length
      if (matchedCount >= limit) break
    }

    const dedup = new Map<string, TraceabilitySummaryItem>()

    for (const record of records) {
      const productName = readStringField(record, ['Product', 'ProductName', 'CropName', '品名', '作物名稱'])
      if (!textContainsKeyword(productName, cropName)) continue

      const producerName = readStringField(record, ['ProducerName', 'FarmerName', 'Producer', '生產者']) || '未揭露'
      const traceCode = readStringField(record, ['TraceCode', 'TraceabilityCode', 'QRCode', '溯源編號']) || '未揭露'
      const county = readStringField(record, ['Place', 'CountyName', 'County', 'City', '縣市']) || '未知'
      const mark = readStringField(record, ['Mark', '認驗證', '標章']) || undefined
      const sourceSystem = record.__source ?? 'MOA Traceability'

      const key = `${productName}_${producerName}_${traceCode}`
      if (dedup.has(key)) continue

      dedup.set(key, {
        productName,
        producerName,
        traceCode,
        county,
        sourceSystem,
        mark,
      })

      if (dedup.size >= limit) break
    }

    return Array.from(dedup.values())
  },
  ['moa-traceability-summary-v2'],
  { revalidate: 21600 }
)

export async function fetchTraceabilitySummary(
  cropName: string,
  limit: number = 5
): Promise<{ items: TraceabilitySummaryItem[]; error?: string }> {
  try {
    const normalizedLimit = Math.max(1, Math.min(Math.floor(limit), 10))
    const items = await fetchTraceabilitySummaryCached(cropName, normalizedLimit)
    return { items }
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : 'Unknown MOA fetch error',
    }
  }
}

const fetchProductCostInsightCached = unstable_cache(
  async (cropName: string): Promise<ProductCostInsight | null> => {
    const variants = [
      { CropName: cropName },
      { ProductName: cropName },
      { Keyword: cropName },
      {},
    ]

    let rows: Record<string, unknown>[] = []
    for (const variant of variants) {
      const params = new URLSearchParams()
      Object.entries(variant).forEach(([key, value]) => params.set(key, value))
      rows = await fetchMOAEndpointRecords<Record<string, unknown>>('ProductCost', params, 3)
      if (rows.length > 0) break
    }

    const samples: number[] = []
    const costFiles: CostSurveyFile[] = []

    for (const row of rows) {
      const productName = readStringField(row, ['CropName', 'ProductName', '品名', '作物名稱'])
      if (productName && !textContainsKeyword(productName, cropName)) continue

      const cost = pickCostPerKg(row)
      if (cost !== null) {
        samples.push(cost)
      }

      // Collect PDF links from ProductCost API
      const pdfUrl = readStringField(row, ['成本檔URL', 'CostFileUrl', 'FileUrl', 'Url'])
      const yearStr = readStringField(row, ['年度', 'Year'])
      const year = yearStr ? parseInt(yearStr, 10) : 0
      const group = readStringField(row, ['群組', 'Group', 'GroupName']) || ''
      if (pdfUrl && year > 0) {
        costFiles.push({ cropName: productName || cropName, year, pdfUrl, group })
      }
    }

    if (samples.length === 0 && costFiles.length === 0) {
      return null
    }

    const avg = samples.length > 0 ? samples.reduce((sum, v) => sum + v, 0) / samples.length : null
    const min = samples.length > 0 ? Math.min(...samples) : null
    const max = samples.length > 0 ? Math.max(...samples) : null

    return {
      cropName,
      avgCostPerKg: avg !== null ? Math.round(avg * 10) / 10 : null,
      minCostPerKg: min !== null ? Math.round(min * 10) / 10 : null,
      maxCostPerKg: max !== null ? Math.round(max * 10) / 10 : null,
      sampleSize: samples.length,
      unit: '元/公斤',
      costFiles: costFiles.length > 0 ? costFiles : undefined,
    }
  },
  ['moa-product-cost-insight-v2'],
  { revalidate: 21600 }
)

export async function fetchProductCostInsight(
  cropName: string
): Promise<{ insight: ProductCostInsight | null; error?: string }> {
  try {
    const insight = await fetchProductCostInsightCached(cropName)
    return { insight }
  } catch (error) {
    return {
      insight: null,
      error: error instanceof Error ? error.message : 'Unknown MOA fetch error',
    }
  }
}

export async function fetchPriceRecords(options: PriceQueryOptions): Promise<{ records: NormalizedPriceRecord[]; error?: string }> {
  const date = options.date ?? todayISO()
  const params = new URLSearchParams({
    Start_time: isoToROC(options.startDate ?? date),
    End_time: isoToROC(options.endDate ?? date),
  })

  if (options.market && options.market !== '全部市場') {
    params.set('MarketName', options.market)
  }

  if (options.cropName) {
    params.set('CropName', options.cropName)
  }

  try {
    const records = await fetchMOARecords(params)
    return { records: records.map(parseRecord) }
  } catch (error) {
    return {
      records: [],
      error: error instanceof Error ? error.message : 'Unknown MOA fetch error',
    }
  }
}

const fetchMarketWindowRecordsCached = unstable_cache(
  async (market: string, startDate: string, endDate: string): Promise<NormalizedPriceRecord[]> => {
    const result = await fetchPriceRecords({ market, startDate, endDate })
    if (result.error) {
      throw new Error(result.error)
    }
    return result.records
  },
  ['moa-market-window-records-v1'],
  { revalidate: 120 }
)

export async function fetchMarketWindowRecords(
  market: string,
  startDate: string,
  endDate: string
): Promise<{ records: NormalizedPriceRecord[]; error?: string }> {
  try {
    const records = await fetchMarketWindowRecordsCached(market, startDate, endDate)
    return { records }
  } catch (error) {
    return {
      records: [],
      error: error instanceof Error ? error.message : 'Unknown MOA fetch error',
    }
  }
}

const fetchMarketDataCached = unstable_cache(
  async (cropName: string, market: string, period: string, endDate: string): Promise<FetchMarketDataResult> => {
    const startDate = subtractDays(endDate, periodToDays(period))
    const params = new URLSearchParams({
      Start_time: isoToROC(startDate),
      End_time: isoToROC(endDate),
      CropName: cropName,
    })

    if (market && market !== '全部市場') {
      params.set('MarketName', market)
    }

    let rawRecords: MOARawRecord[]

    try {
      rawRecords = await fetchMOARecords(params)
    } catch (error) {
      return {
        data: [],
        closedDays: [],
        error: error instanceof Error ? error.message : 'Unknown MOA fetch error',
      }
    }

    if (!rawRecords.length) {
      return {
        data: [],
        closedDays: [],
        error: '查無此作物的交易資料',
      }
    }

    const byDate = new Map<string, { sumPrice: number; sumVolume: number; upper: number; lower: number; count: number }>()

    for (const raw of rawRecords) {
      const record = parseRecord(raw)
      if (!record.date || record.avgPrice <= 0) {
        continue
      }

      const current = byDate.get(record.date) ?? {
        sumPrice: 0,
        sumVolume: 0,
        upper: 0,
        lower: 0,
        count: 0,
      }

      current.sumPrice += record.avgPrice
      current.sumVolume += record.transWeight
      current.upper = current.upper ? Math.max(current.upper, record.upperPrice) : record.upperPrice
      current.lower = current.lower ? Math.min(current.lower, record.lowerPrice) : record.lowerPrice
      current.count += 1
      byDate.set(record.date, current)
    }

    const closedDays: string[] = []
    const data = dateRange(startDate, endDate).map((date) => {
      const current = byDate.get(date)

      if (!current || current.count === 0) {
        closedDays.push(date)
        return {
          date,
          label: dateLabel(date),
          avgPrice: null,
          upperPrice: null,
          lowerPrice: null,
          volume: null,
          isClosed: true,
        }
      }

      return {
        date,
        label: dateLabel(date),
        avgPrice: Math.round((current.sumPrice / current.count) * 10) / 10,
        upperPrice: Math.round(current.upper * 10) / 10,
        lowerPrice: Math.round(current.lower * 10) / 10,
        volume: Math.round(current.sumVolume),
        isClosed: false,
      }
    })

    return { data, closedDays }
  },
  ['moa-market-data-v1'],
  { revalidate: 120 }
)

export async function fetchMarketData(cropName: string, market: string, period: string): Promise<FetchMarketDataResult> {
  const endDate = todayISO()
  return fetchMarketDataCached(cropName, market, period, endDate)
}

export async function fetchSearchRecords(options: PriceQueryOptions): Promise<SearchRecordsResult> {
  const endDate = options.endDate ?? options.date ?? todayISO()
  const startDate = options.startDate ?? endDate
  // Look back 7 days to find the real previous trading day (handles holidays/weekends)
  const previousDate = subtractDays(startDate, 7)

  // Make a single bulk request instead of N+1 requests
  const bulkRes = await fetchPriceRecords({
    cropName: options.cropName,
    market: options.market,
    startDate: previousDate,
    endDate: endDate
  })

  if (bulkRes.error) {
    return { records: [], error: bulkRes.error }
  }

  const records: NormalizedPriceRecord[] = []
  // Track the most recent pre-period price per crop+market for priceChange baseline
  const prePriceTracker = new Map<string, { date: string; price: number }>()

  for (const record of bulkRes.records) {
    if (!record.date) continue

    if (record.date < startDate) {
      // Keep only the most recent pre-period record per crop+market
      const key = `${record.cropCode}_${record.marketName}`
      const existing = prePriceTracker.get(key)
      if (!existing || record.date > existing.date) {
        prePriceTracker.set(key, { date: record.date, price: record.avgPrice })
      }
    }

    if (record.date >= startDate && record.date <= endDate) {
      records.push(record)
    }
  }

  if (records.length === 0) {
    // Empty result is not an upstream error — return empty list so callers render
    // an empty state rather than showing a generic "502 gateway" error.
    return { records: [] }
  }

  const previousPriceMap = new Map<string, number>()
  prePriceTracker.forEach(({ price }, key) => {
    previousPriceMap.set(key, price)
  })

  const grouped = new Map<string, {
    cropCode: string
    cropName: string
    marketName: string
    upperPrice: number
    middlePriceSum: number
    lowerPrice: number
    avgPriceSum: number
    transWeight: number
    count: number
    latestDate: string
    latestAvgPrice: number
  }>()

  records.forEach((record) => {
    const key = `${record.cropCode}_${record.marketName}`
    const current = grouped.get(key) ?? {
      cropCode: record.cropCode,
      cropName: record.cropName,
      marketName: record.marketName,
      upperPrice: record.upperPrice,
      middlePriceSum: 0,
      lowerPrice: record.lowerPrice,
      avgPriceSum: 0,
      transWeight: 0,
      count: 0,
      latestDate: record.date,
      latestAvgPrice: record.avgPrice,
    }

    current.upperPrice = Math.max(current.upperPrice, record.upperPrice)
    current.lowerPrice = Math.min(current.lowerPrice, record.lowerPrice)
    current.middlePriceSum += record.middlePrice
    current.avgPriceSum += record.avgPrice
    current.transWeight += record.transWeight
    current.count += 1

    if (record.date >= current.latestDate) {
      current.latestDate = record.date
      current.latestAvgPrice = record.avgPrice
    }

    grouped.set(key, current)
  })

  const searchRecords: ProducePrice[] = Array.from(grouped.values())
    .map((group) => {
      const previousPrice = previousPriceMap.get(`${group.cropCode}_${group.marketName}`)
      const priceChange = previousPrice !== undefined && previousPrice > 0
        ? ((group.latestAvgPrice - previousPrice) / previousPrice) * 100
        : 0

      return {
        cropCode: group.cropCode,
        cropName: group.cropName,
        marketName: group.marketName,
        upperPrice: Math.round(group.upperPrice * 10) / 10,
        middlePrice: Math.round((group.middlePriceSum / group.count) * 10) / 10,
        lowerPrice: Math.round(group.lowerPrice * 10) / 10,
        avgPrice: Math.round((group.avgPriceSum / group.count) * 10) / 10,
        transWeight: Math.round(group.transWeight),
        date: group.latestDate,
        priceChange: Math.round(priceChange * 10) / 10,
      }
    })
    .sort((left, right) => left.cropName.localeCompare(right.cropName, 'zh-TW'))

  return { records: searchRecords }
}

function aggregateMarketByDate(records: NormalizedPriceRecord[]): Map<string, MarketDailyAggregate> {
  const grouped = new Map<string, MarketDailyAggregate>()

  for (const record of records) {
    if (!record.date) continue

    const current = grouped.get(record.date) ?? {
      priceSum: 0,
      priceCount: 0,
      volumeSum: 0,
      recordCount: 0,
    }

    if (record.avgPrice > 0) {
      current.priceSum += record.avgPrice
      current.priceCount += 1
    }

    current.volumeSum += record.transWeight
    current.recordCount += 1
    grouped.set(record.date, current)
  }

  return grouped
}

const fetchMarketOverviewTrendCached = unstable_cache(
  async (market: string, days: number, endDate: string): Promise<MarketOverviewTrendPoint[]> => {
    const startDate = subtractDays(endDate, Math.max(days - 1, 0))
    const bulkRes = await fetchMarketWindowRecords(market, startDate, endDate)

    if (bulkRes.error) {
      throw new Error(bulkRes.error)
    }

    if (bulkRes.records.length === 0) {
      return []
    }

    const grouped = aggregateMarketByDate(bulkRes.records)

    return dateRange(startDate, endDate).map((date) => {
      const current = grouped.get(date)
      if (!current || current.recordCount === 0) {
        return {
          date,
          label: dateLabel(date),
          avgPrice: null,
          volume: null,
        }
      }

      return {
        date,
        label: dateLabel(date),
        avgPrice: current.priceCount > 0
          ? Math.round((current.priceSum / current.priceCount) * 10) / 10
          : null,
        volume: Math.round(current.volumeSum),
      }
    })
  },
  ['moa-market-overview-trend-v2'],
  { revalidate: 120 }
)

export async function fetchMarketOverviewTrend(
  market: string,
  days: number,
  endDate: string = todayISO()
): Promise<MarketOverviewTrendResult> {
  const normalizedDays = Math.min(Math.max(Math.floor(days), 1), 30)

  try {
    const points = await fetchMarketOverviewTrendCached(market, normalizedDays, endDate)
    if (points.length === 0) {
      return { points: [], error: '查無市場趨勢資料' }
    }
    return { points }
  } catch (error) {
    return {
      points: [],
      error: error instanceof Error ? error.message : 'Unknown MOA fetch error',
    }
  }
}

interface RawEggRecord {
  TransDate: string
  egg_Price: string
  egg_Producer_Price: string
}

interface RawPorkRecord {
  TransDate: string
  MarketName: string
  TransNum_Total: number
  TransNum_AvgPrice: number
}

const fetchLivestockPricesCached = unstable_cache(
  async (): Promise<LivestockPrices> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
    // Pass a 30-day window to the egg API to guarantee we get multiple dates for comparison
    const endISO = todayISO()
    const startISO = subtractDays(endISO, 30)
    // Egg API expects Gregorian slash format: "YYYY/MM/DD"
    const eggParams = new URLSearchParams({
      Start_time: startISO.replace(/-/g, '/'),
      End_time: endISO.replace(/-/g, '/'),
    })

    const [eggRes, porkRes] = await Promise.all([
      fetch(`https://data.moa.gov.tw/api/v1/PoultryTransType_BoiledChicken_Eggs/?${eggParams}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }),
      fetch('https://data.moa.gov.tw/api/v1/PorkTransType/', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }),
    ])

    if (!eggRes.ok) throw new Error(`Egg API returned HTTP ${eggRes.status}`)
    if (!porkRes.ok) throw new Error(`Pork API returned HTTP ${porkRes.status}`)

    const [eggJson, porkJson] = await Promise.all([
      eggRes.json() as Promise<{ Data: RawEggRecord[] }>,
      porkRes.json() as Promise<{ Data: RawPorkRecord[] }>,
    ])

    // --- Egg prices (TransDate: Gregorian "2026/05/04") ---
    // Sort descending so [0] is the most recent record regardless of API ordering
    const eggData = (eggJson.Data ?? []).sort((a, b) => b.TransDate.localeCompare(a.TransDate))
    const latestEgg = eggData[0]
    const prevEgg = eggData.find((r) => r.TransDate !== latestEgg?.TransDate)
    const eggPrice = latestEgg ? parseFloat(latestEgg.egg_Price) || null : null
    const prevEggPrice = prevEgg ? parseFloat(prevEgg.egg_Price) || null : null
    const eggPriceChange =
      eggPrice !== null && prevEggPrice !== null && prevEggPrice > 0
        ? Math.round(((eggPrice - prevEggPrice) / prevEggPrice) * 1000) / 10
        : null

    // --- Pork prices: weighted average across markets (TransDate: ROC "1150504") ---
    // Sort descending — string sort works since ROC YYYYMMDD is zero-padded
    const porkData = (porkJson.Data ?? []).sort((a, b) => b.TransDate.localeCompare(a.TransDate))
    const latestPorkDate = porkData[0]?.TransDate
    const prevPorkDate = porkData.find((r) => r.TransDate !== latestPorkDate)?.TransDate

    function weightedPorkAvg(records: RawPorkRecord[]): number | null {
      const totalHead = records.reduce((s, r) => s + (r.TransNum_Total || 0), 0)
      if (totalHead === 0) return null
      const weighted = records.reduce((s, r) => s + r.TransNum_AvgPrice * (r.TransNum_Total || 0), 0)
      return Math.round((weighted / totalHead) * 10) / 10
    }

    const todayPork = porkData.filter((r) => r.TransDate === latestPorkDate)
    const prevPork = porkData.filter((r) => r.TransDate === prevPorkDate)
    const porkAvgPrice = weightedPorkAvg(todayPork)
    const prevPorkAvgPrice = weightedPorkAvg(prevPork)
    const porkPriceChange =
      porkAvgPrice !== null && prevPorkAvgPrice !== null && prevPorkAvgPrice > 0
        ? Math.round(((porkAvgPrice - prevPorkAvgPrice) / prevPorkAvgPrice) * 1000) / 10
        : null

    // Egg TransDate is ISO e.g. "2026/05/04"
    const eggDate = latestEgg?.TransDate?.replace(/\//g, '-') ?? todayISO()

    return {
      date: eggDate,
      eggPrice,
      eggProducerPrice: latestEgg ? parseFloat(latestEgg.egg_Producer_Price) || null : null,
      porkAvgPrice,
      eggPriceChange,
      porkPriceChange,
    }
  } finally {
    clearTimeout(timer)
  }
  },
  ['moa-livestock-prices-v1'],
  { revalidate: 300 }
)

export async function fetchLivestockPrices(): Promise<LivestockPrices> {
  return fetchLivestockPricesCached()
}

// Returns the top-3 crops by total trading volume over the last 7 days.
// Uses a 5-page cap (vs global MAX_PAGES=50) to stay within Vercel function budgets.
const fetchSeasonalCropsCached = unstable_cache(
  async (dateKey: string): Promise<{ crops: SeasonalItem[]; error?: string }> => {
    const endDate = dateKey
    const startDate = subtractDays(endDate, 7)
    const params = new URLSearchParams({
      Start_time: isoToROC(startDate),
      End_time: isoToROC(endDate),
    })

    let rawRecords: MOARawRecord[]
    try {
      rawRecords = await fetchMOARecords(params, 5)
    } catch (error) {
      return { crops: [], error: error instanceof Error ? error.message : 'MOA fetch error' }
    }

    if (rawRecords.length === 0) return { crops: [], error: '查無近期交易資料' }

    const volumeMap = new Map<string, number>()
    for (const raw of rawRecords) {
      const record = parseRecord(raw)
      if (!record.cropName || record.transWeight <= 0) continue
      volumeMap.set(record.cropName, (volumeMap.get(record.cropName) ?? 0) + record.transWeight)
    }

    const crops = [...volumeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cropName]) => {
        const desc = CROP_DESCRIPTIONS[cropName]
        return {
          cropName,
          emoji: getCropEmoji(cropName),
          category: getProduceCategory(cropName),
          reason: desc?.reason ?? '近期交易量排行',
          note: desc?.note ?? `${cropName}近期交易活躍，可留意行情動態。`,
        }
      })

    return { crops }
  },
  ['moa-seasonal-crops-v2'],
  { revalidate: 1800 }
)

export async function fetchSeasonalCrops(): Promise<{ crops: SeasonalItem[]; error?: string }> {
  const dateKey = todayISO()
  try {
    return await fetchSeasonalCropsCached(dateKey)
  } catch (error) {
    return { crops: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}