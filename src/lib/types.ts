export interface ProducePrice {
  cropCode: string
  cropName: string
  marketName: string
  upperPrice: number
  middlePrice: number
  lowerPrice: number
  avgPrice: number
  transWeight: number
  date: string // ISO: YYYY-MM-DD
  priceChange?: number
}

export interface MarketOverview {
  date: string
  avgPrice: number
  totalVolume: number
  priceChange: number
  volumeChange: number
  marketName: string
  updatedAt?: string
}

export interface TopMover {
  cropCode: string
  cropName: string
  marketName: string
  grade: string
  currentPrice: number
  priceChange: number
  emoji: string
}

export interface PriceHistoryPoint {
  date: string
  /** null on closed market days — Recharts uses connectNulls to bridge the gap */
  avgPrice:   number | null
  upperPrice?: number | null
  lowerPrice?: number | null
  volume:      number | null
  label: string
  isClosed?: boolean
}

export interface HistoryApiResponse {
  data:       PriceHistoryPoint[]
  closedDays: string[]
  warning?:   string
  updatedAt?: string
}

export interface MarketComparison {
  marketName: string
  avgPrice: number
  priceChange: number
}

export interface WatchlistItem {
  cropCode: string
  cropName: string
  emoji: string
  addedAt: string
}

export interface SearchFilters {
  market: string
  dateRange: '1d' | '1w' | '1m'
  sortBy: 'name' | 'price_asc' | 'price_desc' | 'change'
  category: 'all' | 'vegetable' | 'fruit' | 'flower' | 'mushroom'
}

export type PricePeriod = '1W' | '1M' | '3M'

export interface SeasonalItem {
  cropName: string
  emoji: string
  category: string
  reason: string
  note: string
}

export interface LivestockPrices {
  date: string
  /** 雞蛋大運輸價 (元/台斤) */
  eggPrice: number | null
  /** 雞蛋產地價 (元/台斤) */
  eggProducerPrice: number | null
  /** 毛豬全國加權均價 (元/公斤) */
  porkAvgPrice: number | null
  
  // -- 新增加的家禽/畜產擴充 --
  /** 白肉雞價 (元/台斤) */
  chickenPrice?: number | null
  /** 紅羽土雞 (元/台斤) */
  redFeatherChickenPrice?: number | null
  /** 鵝價 (元/台斤) */
  goosePrice?: number | null
  /** 鴨價 (元/台斤) */
  duckPrice?: number | null
  /** 羊隻拍賣均價 (元/公斤) */
  sheepAvgPrice?: number | null

  eggPriceChange: number | null
  porkPriceChange: number | null
}

export interface MarketTypeOption {
  value: 'Veg' | 'Fruit' // | 'Flower'
  label: string
  description: string
}

export interface MarketOptionsResponse {
  marketTypes: MarketTypeOption[]
  marketsByType: Record<'Veg' | 'Fruit', string[]> // | 'Flower'
  defaultMarketType: 'Veg' | 'Fruit' // | 'Flower'
  defaultMarket: string
  dateRanges: Array<{ label: string; value: SearchFilters['dateRange'] }>
  pricePeriods: Array<PricePeriod>
  source: string
  updatedAt: string
}

export interface MarketRestDay {
  marketName: string
  date: string
  note?: string
}

export interface MarketWeatherObservation {
  stationName: string
  county: string
  observedAt: string
  temperatureC: number | null
  rainfallMm: number | null
  humidityPct: number | null
}

export interface MarketWeatherRiskSummary {
  market: string
  county: string
  score: number
  level: 'low' | 'medium' | 'high'
  reasons: string[]
  metrics: {
    maxTemperatureC: number | null
    minTemperatureC: number | null
    maxRainfallMm: number | null
    avgHumidityPct: number | null
  }
}

export interface TraceabilitySummaryItem {
  productName: string
  producerName: string
  traceCode: string
  county: string
  sourceSystem: string
  mark?: string
}

export interface CostSurveyFile {
  cropName: string
  year: number
  pdfUrl: string
  group: string
}

export interface CropInfo {
  feature: string
  season: string
  origin: string
}

export interface ProductCostInsight {
  cropName: string
  avgCostPerKg: number | null
  minCostPerKg: number | null
  maxCostPerKg: number | null
  sampleSize: number
  unit: string
  costFiles?: CostSurveyFile[]
}
