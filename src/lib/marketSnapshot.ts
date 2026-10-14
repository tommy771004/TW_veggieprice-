// One market's latest trading day, grouped by crop, vs. its previous trading day.
// Pure so it can be tested without the daily files; the fs loader lives in
// src/lib/server/marketSnapshot.ts.

import { cropBaseName } from './cropInfo.ts'

export interface DailyRow {
  CropName: string
  MarketName: string
  TcType?: string
  Avg_Price: number | string
  Trans_Quantity: number | string
}

export interface MarketCropItem {
  /** MOA base 品名 (甘藍), varieties merged. */
  name: string
  avgPrice: number
  volume: number
  /** % vs the market's previous trading day; null when the crop didn't trade then. */
  changePct: number | null
}

export interface MarketSnapshot {
  date: string
  prevDate: string | null
  items: MarketCropItem[]
  totalVolume: number
}

const PRODUCE_TYPES = new Set(['N04', 'N05'])

function groupByCrop(rows: DailyRow[], market: string): Map<string, { price: number; volume: number }> {
  const sums = new Map<string, { weighted: number; volume: number }>()
  for (const r of rows) {
    if (r.MarketName !== market) continue
    if (r.TcType && !PRODUCE_TYPES.has(r.TcType)) continue
    const price = Number(r.Avg_Price)
    const volume = Number(r.Trans_Quantity)
    if (!(price > 0) || !(volume > 0) || r.CropName === '休市') continue
    const name = cropBaseName(r.CropName)
    // MOA's catch-all bucket isn't a crop and has no page to link to.
    if (name === '其他') continue
    const acc = sums.get(name) ?? { weighted: 0, volume: 0 }
    acc.weighted += price * volume
    acc.volume += volume
    sums.set(name, acc)
  }
  const out = new Map<string, { price: number; volume: number }>()
  for (const [name, { weighted, volume }] of sums) {
    out.set(name, { price: weighted / volume, volume })
  }
  return out
}

/**
 * @param days newest-first list of [isoDate, rows]; the first day where the
 *   market traded becomes `date`, the next one `prevDate`.
 */
export function buildMarketSnapshot(market: string, days: Array<[string, DailyRow[]]>): MarketSnapshot | null {
  const traded: Array<[string, Map<string, { price: number; volume: number }>]> = []
  for (const [date, rows] of days) {
    const grouped = groupByCrop(rows, market)
    if (grouped.size > 0) traded.push([date, grouped])
    if (traded.length === 2) break
  }
  if (traded.length === 0) return null

  const [[date, latest], prev] = traded
  const items: MarketCropItem[] = [...latest].map(([name, { price, volume }]) => {
    const before = prev?.[1].get(name)
    return {
      name,
      avgPrice: Math.round(price * 10) / 10,
      volume: Math.round(volume),
      changePct: before ? Math.round(((price - before.price) / before.price) * 1000) / 10 : null,
    }
  })
  items.sort((a, b) => b.volume - a.volume)

  return {
    date,
    prevDate: prev?.[0] ?? null,
    items,
    totalVolume: items.reduce((s, i) => s + i.volume, 0),
  }
}

/** Biggest movers, ignoring thin trades where a few crates swing the average. */
export function topMovers(items: MarketCropItem[], minVolume = 1000, count = 5) {
  const moved = items.filter(
    (i): i is MarketCropItem & { changePct: number } => i.changePct !== null && i.volume >= minVolume,
  )
  return {
    up: moved.filter((i) => i.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, count),
    down: moved.filter((i) => i.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, count),
  }
}
