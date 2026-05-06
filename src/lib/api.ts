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

const BASE = '/api'

export async function fetchMarketOverview(date?: string, market = '台北一'): Promise<MarketOverview> {
  const params = new URLSearchParams({ market })
  if (date) params.set('date', date)
  const res = await fetch(`${BASE}/prices/overview?${params}`)
  if (!res.ok) throw new Error('Failed to fetch overview')
  return res.json()
}

export async function fetchTopMovers(date?: string): Promise<TopMover[]> {
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  const res = await fetch(`${BASE}/prices/movers?${params}`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch movers')
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
  if (params.market && params.market !== '全部市場') query.set('market', params.market)
  if (params.date) query.set('date', params.date)
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)
  const res = await fetch(`${BASE}/prices?${query}`)
  if (!res.ok) throw new Error('Failed to fetch prices')
  return res.json()
}

export async function fetchPriceHistory(
  cropName: string,
  period: string
): Promise<HistoryApiResponse> {
  const params = new URLSearchParams({ crop: cropName, period })
  const res = await fetch(`${BASE}/prices/history?${params}`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

export async function fetchMarketComparison(
  cropName: string,
  date?: string
): Promise<MarketComparison[]> {
  const params = new URLSearchParams({ crop: cropName })
  if (date) params.set('date', date)
  const res = await fetch(`${BASE}/prices/markets?${params}`)
  if (!res.ok) throw new Error('Failed to fetch market comparison')
  return res.json()
}

export async function fetchMarketList(type: string = 'Veg'): Promise<string[]> {
  const res = await fetch(`${BASE}/markets/list?type=${type}`)
  if (!res.ok) throw new Error('Failed to fetch market list')
  return res.json()
}

export async function fetchLivestock(): Promise<LivestockPrices> {
  const res = await fetch(`${BASE}/prices/livestock`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch livestock prices')
  return json as LivestockPrices
}

export async function fetchSeasonal(): Promise<SeasonalItem[]> {
  const res = await fetch(`${BASE}/prices/seasonal`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch seasonal')
  return json as SeasonalItem[]
}

export async function fetchMarketOptions(): Promise<MarketOptionsResponse> {
  const res = await fetch(`${BASE}/meta/options`)
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

  const res = await fetch(`${BASE}/insights/rest-days?${query}`)
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

  const res = await fetch(`${BASE}/insights/weather?${query}`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch market weather')
  return (json as { items: MarketWeatherObservation[] }).items
}

export async function fetchTraceabilitySummary(cropName: string): Promise<TraceabilitySummaryItem[]> {
  const params = new URLSearchParams({ crop: cropName })
  const res = await fetch(`${BASE}/prices/traceability?${params}`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch traceability summary')
  return (json as { items: TraceabilitySummaryItem[] }).items
}

export async function fetchProductCostInsight(cropName: string): Promise<ProductCostInsight | null> {
  const params = new URLSearchParams({ crop: cropName })
  const res = await fetch(`${BASE}/prices/cost?${params}`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch product cost insight')
  return (json as { insight: ProductCostInsight | null }).insight
}

export async function fetchMarketWeatherRisk(market: string): Promise<MarketWeatherRiskSummary> {
  const params = new URLSearchParams({ market })
  const res = await fetch(`${BASE}/insights/weather-risk?${params}`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch market weather risk')
  return json as MarketWeatherRiskSummary
}
