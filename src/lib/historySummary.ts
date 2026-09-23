import type { PriceHistoryPoint } from './types'

/** Chart interpolation is not an observed quote and must not drive headline prices. */
export function summarizeHistory(history: PriceHistoryPoint[]) {
  const observed = history.filter((point): point is PriceHistoryPoint & { avgPrice: number } =>
    !point.isClosed && point.avgPrice !== null && Number.isFinite(point.avgPrice) && point.avgPrice > 0,
  ).sort((a, b) => a.date.localeCompare(b.date))
  const latest = observed.at(-1)
  const previous = observed.filter(point => point.date !== latest?.date).at(-1)
  return {
    observed,
    latest,
    previous,
    change: latest && previous ? (latest.avgPrice - previous.avgPrice) / previous.avgPrice * 100 : null,
  }
}
