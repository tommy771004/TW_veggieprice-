/**
 * Aggregate multi-market daily quotes into one history series.
 *
 * Product rules (detail page U/A/L band):
 * - Scheme B (single market): caller filters to one market first; this
 *   module then averages that market's rows only (usually one row/day).
 * - Scheme C (national / all markets): simple mean of each market's
 *   上價 / 平均價 / 下價 — not max(上)/min(下), which exaggerates the band.
 * - Volume = sum of market volumes that day.
 * - Closed days (no priced rows) are marked isClosed and price-interpolated.
 */

export interface AggregationInputRecord {
  date: string
  avgPrice: number
  upperPrice: number
  lowerPrice: number
  transWeight: number
}

export interface HistoryPointLike {
  date: string
  label: string
  avgPrice: number | null
  upperPrice: number | null
  lowerPrice: number | null
  volume: number | null
  isClosed: boolean
}

export interface BuildInterpolatedHistoryOptions {
  records: AggregationInputRecord[]
  dates: string[]
  labelForDate: (date: string) => string
}

interface DailyAggregate {
  sumAvg: number
  sumUpper: number
  sumLower: number
  sumVolume: number
  count: number
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10
}

function interpolateValue(
  previous: number | null,
  next: number | null,
  fraction: number
): number | null {
  if (previous === null || next === null) return null
  return roundTenth(previous + (next - previous) * fraction)
}

function copyPrices(point: HistoryPointLike): Pick<HistoryPointLike, 'avgPrice' | 'upperPrice' | 'lowerPrice'> {
  return {
    avgPrice: point.avgPrice,
    upperPrice: point.upperPrice,
    lowerPrice: point.lowerPrice,
  }
}

export function buildInterpolatedHistory({
  records,
  dates,
  labelForDate,
}: BuildInterpolatedHistoryOptions): { data: HistoryPointLike[]; closedDays: string[] } {
  const byDate = new Map<string, DailyAggregate>()

  for (const record of records) {
    if (!record.date || record.avgPrice <= 0) continue

    const current = byDate.get(record.date) ?? {
      sumAvg: 0,
      sumUpper: 0,
      sumLower: 0,
      sumVolume: 0,
      count: 0,
    }

    current.sumAvg += record.avgPrice
    current.sumUpper += record.upperPrice
    current.sumLower += record.lowerPrice
    current.sumVolume += record.transWeight
    current.count += 1
    byDate.set(record.date, current)
  }

  const closedDays: string[] = []
  const data = dates.map((date) => {
    const current = byDate.get(date)

    if (!current || current.count === 0) {
      closedDays.push(date)
      return {
        date,
        label: labelForDate(date),
        avgPrice: null,
        upperPrice: null,
        lowerPrice: null,
        volume: null,
        isClosed: true,
      }
    }

    return {
      date,
      label: labelForDate(date),
      avgPrice: roundTenth(current.sumAvg / current.count),
      upperPrice: roundTenth(current.sumUpper / current.count),
      lowerPrice: roundTenth(current.sumLower / current.count),
      volume: Math.round(current.sumVolume),
      isClosed: false,
    }
  })

  const previousTradingIndex: number[] = Array(data.length).fill(-1)
  const nextTradingIndex: number[] = Array(data.length).fill(-1)

  let previous = -1
  for (let index = 0; index < data.length; index += 1) {
    if (!data[index].isClosed) previous = index
    previousTradingIndex[index] = previous
  }

  let next = -1
  for (let index = data.length - 1; index >= 0; index -= 1) {
    if (!data[index].isClosed) next = index
    nextTradingIndex[index] = next
  }

  const filledData = data.map((point, index) => {
    if (!point.isClosed) return point

    const prevIdx = previousTradingIndex[index]
    const nextIdx = nextTradingIndex[index]

    if (prevIdx !== -1 && nextIdx !== -1 && prevIdx !== nextIdx) {
      const prevPoint = data[prevIdx]
      const nextPoint = data[nextIdx]
      const fraction = (index - prevIdx) / (nextIdx - prevIdx)

      return {
        ...point,
        avgPrice: interpolateValue(prevPoint.avgPrice, nextPoint.avgPrice, fraction),
        upperPrice: interpolateValue(prevPoint.upperPrice, nextPoint.upperPrice, fraction),
        lowerPrice: interpolateValue(prevPoint.lowerPrice, nextPoint.lowerPrice, fraction),
      }
    }

    if (prevIdx !== -1) {
      return { ...point, ...copyPrices(data[prevIdx]) }
    }

    if (nextIdx !== -1) {
      return { ...point, ...copyPrices(data[nextIdx]) }
    }

    return point
  })

  return { data: filledData, closedDays }
}
