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
  sumPrice: number
  sumVolume: number
  upper: number
  lower: number
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
      avgPrice: roundTenth(current.sumPrice / current.count),
      upperPrice: roundTenth(current.upper),
      lowerPrice: roundTenth(current.lower),
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
