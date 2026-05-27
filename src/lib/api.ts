import type {
  ProducePrice,
  MarketOverview,
  TopMover,
  HistoryApiResponse,
  MarketComparison,
  LivestockPrices,
  SeasonalItem,
  MarketOptionsResponse,
  MarketRestDay,
  MarketWeatherObservation,
  TraceabilitySummaryItem,
  ProductCostInsight,
  MarketWeatherRiskSummary,
} from './types'
import { DEFAULT_MARKET, ALL_MARKET_SENTINEL } from './constants'

const BASE = '/api'

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new Error('伺服器連線失敗，請檢查網路狀態或稍後再試')
    }
    throw error
  }
}

export async function fetchMarketOverview(date?: string, market = DEFAULT_MARKET): Promise<MarketOverview> {
  const params = new URLSearchParams({ market })
  if (date) params.set('date', date)
  const res = await safeFetch(`${BASE}/prices/overview?${params}`)
  if (!res.ok) throw new Error('Failed to fetch overview')
  return res.json()
}

export async function fetchTopMovers(date?: string, category?: string): Promise<TopMover[]> {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (category) params.set('category', category)
  const res = await safeFetch(`${BASE}/prices/movers?${params}`)
  const json = await res.json()
  if (!res.ok) {
    const errorMsg = (json as { error?: string }).error
    throw new Error((errorMsg && errorMsg.includes('fetch')) ? '連線至農業部伺服器失敗，請稍後再試' : (errorMsg ?? 'Failed to fetch movers'))
  }
  return json as TopMover[]
}

export async function fetchPrices(params: {
  cropName?: string
  market?: string
  date?: string
  startDate?: string
  endDate?: string
}): Promise<ProducePrice[]> {
  const query = new URLSearchParams()
  if (params.cropName) query.set('crop', params.cropName)
  if (params.market && params.market !== ALL_MARKET_SENTINEL) query.set('market', params.market)
  if (params.date) query.set('date', params.date)
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)
  const res = await safeFetch(`${BASE}/prices?${query}`)
  if (!res.ok) throw new Error('Failed to fetch prices')
  return res.json()
}

export async function fetchPriceHistory(
  cropName: string,
  period: string
): Promise<HistoryApiResponse> {
  const params = new URLSearchParams({ crop: cropName, period })
  const res = await safeFetch(`${BASE}/prices/history?${params}`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

export async function fetchMarketComparison(
  cropName: string,
  date?: string
): Promise<MarketComparison[]> {
  const params = new URLSearchParams({ crop: cropName })
  if (date) params.set('date', date)
  const res = await safeFetch(`${BASE}/prices/markets?${params}`)
  if (!res.ok) throw new Error('Failed to fetch market comparison')
  return res.json()
}

export async function fetchMarketList(type: string = 'Veg'): Promise<string[]> {
  const res = await safeFetch(`${BASE}/markets/list?type=${type}`)
  if (!res.ok) throw new Error('Failed to fetch market list')
  return res.json()
}

export async function fetchLivestock(): Promise<LivestockPrices> {
  const res = await safeFetch(`${BASE}/prices/livestock`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch livestock prices')
  return json as LivestockPrices
}

export async function fetchSeasonal(): Promise<SeasonalItem[]> {
  const res = await safeFetch(`${BASE}/prices/seasonal`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch seasonal')
  return json as SeasonalItem[]
}

export async function fetchMarketOptions(): Promise<MarketOptionsResponse> {
  const res = await safeFetch(`${BASE}/meta/options`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch market options')
  return json as MarketOptionsResponse
}

export async function fetchMarketRestDays(params?: {
  market?: string
  startDate?: string
  endDate?: string
}): Promise<MarketRestDay[]> {
  const query = new URLSearchParams()
  if (params?.market) query.set('market', params.market)
  if (params?.startDate) query.set('startDate', params.startDate)
  if (params?.endDate) query.set('endDate', params.endDate)

  const res = await safeFetch(`${BASE}/insights/rest-days?${query}`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch market rest days')
  return (json as { items: MarketRestDay[] }).items
}

export async function fetchMarketWeather(params?: {
  county?: string
  limit?: number
}): Promise<MarketWeatherObservation[]> {
  const query = new URLSearchParams()
  if (params?.county) query.set('county', params.county)
  if (typeof params?.limit === 'number') query.set('limit', String(params.limit))

  const res = await safeFetch(`${BASE}/insights/weather?${query}`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch market weather')
  return (json as { items: MarketWeatherObservation[] }).items
}

export async function fetchTraceabilitySummary(cropName: string): Promise<TraceabilitySummaryItem[]> {
  const params = new URLSearchParams({ crop: cropName })
  const res = await safeFetch(`${BASE}/prices/traceability?${params}`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch traceability summary')
  return (json as { items: TraceabilitySummaryItem[] }).items
}

export async function fetchProductCostInsight(cropName: string): Promise<ProductCostInsight | null> {
  const params = new URLSearchParams({ crop: cropName })
  const res = await safeFetch(`${BASE}/prices/cost?${params}`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch product cost insight')
  return (json as { insight: ProductCostInsight | null }).insight
}

export async function fetchMarketWeatherRisk(market: string): Promise<MarketWeatherRiskSummary> {
  const params = new URLSearchParams({ market })
  const res = await safeFetch(`${BASE}/insights/weather-risk?${params}`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch market weather risk')
  return json as MarketWeatherRiskSummary
}
