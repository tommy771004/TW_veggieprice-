import { NextResponse } from 'next/server'
import { getCropEmoji } from '@/lib/utils'
import { fetchMarketWindowRecords } from '@/lib/server/moa'
import { subtractDays, todayISO } from '@/lib/server/dateUtils'

// Minimum transaction weight (kg) required both today and in the 3-day baseline
// to prevent low-volume outliers from dominating the movers list.
const MIN_WEIGHT = 100

export async function GET() {
  const today = todayISO()
  const rangeStart = subtractDays(today, 7)

  // Single bulk range fetch (already cached at 120 s) instead of 7 parallel day queries.
  const { records: allRecords, error } = await fetchMarketWindowRecords('全部市場', rangeStart, today)

  if (error || allRecords.length === 0) {
    return NextResponse.json({ error: error ?? '查無波動排行資料' }, { status: error ? 502 : 404 })
  }

  // Collect distinct trading dates in descending order.
  const tradingDates = [...new Set(allRecords.map((r) => r.date).filter(Boolean))].sort().reverse()
  const latestDate = tradingDates[0] ?? ''

  if (!latestDate) {
    return NextResponse.json({ error: '查無波動排行資料' }, { status: 404 })
  }

  // Use up to 3 prior trading days as the baseline window.
  // A 3-day VWAP (volume-weighted average price) smooths single-day anomalies and
  // holiday gaps better than a direct yesterday-vs-today comparison.
  const baselineDates = new Set(tradingDates.slice(1, 4))

  const latestRecords: typeof allRecords = []
  // key = cropName_marketName_grade for exact matching (avoids grade mixing)
  const baselineAccum: Record<string, { sumPriceVol: number; sumVol: number }> = {}

  for (const record of allRecords) {
    if (record.date === latestDate) {
      latestRecords.push(record)
    } else if (baselineDates.has(record.date) && record.avgPrice > 0 && record.transWeight > 0) {
      const key = `${record.cropName}_${record.marketName}_${record.grade}`
      const acc = baselineAccum[key] ?? (baselineAccum[key] = { sumPriceVol: 0, sumVol: 0 })
      acc.sumPriceVol += record.avgPrice * record.transWeight
      acc.sumVol += record.transWeight
    }
  }

  // Compute final VWAP baseline; require minimum cumulative volume for stability.
  const baselineMap: Record<string, number> = {}
  for (const [key, { sumPriceVol, sumVol }] of Object.entries(baselineAccum)) {
    if (sumVol >= MIN_WEIGHT) {
      baselineMap[key] = sumPriceVol / sumVol
    }
  }

  const movers = latestRecords
    .map((record) => {
      const key = `${record.cropName}_${record.marketName}_${record.grade}`
      const currentPrice = record.avgPrice || 0
      const baselinePrice = baselineMap[key]
      if (baselinePrice === undefined) return null
      const change = baselinePrice > 0 ? ((currentPrice - baselinePrice) / baselinePrice) * 100 : 0
      return {
        cropCode: record.cropCode,
        cropName: record.cropName,
        marketName: record.marketName,
        grade: record.grade,
        currentPrice,
        priceChange: Math.round(change * 10) / 10,
        emoji: getCropEmoji(record.cropName),
        transWeight: record.transWeight,
      }
    })
    .filter(
      (m): m is NonNullable<typeof m> =>
        m !== null && m.currentPrice >= 3 && m.transWeight >= MIN_WEIGHT,
    )
    .sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange))
    .slice(0, 6)

  if (movers.length === 0) {
    return NextResponse.json({ error: '查無波動排行資料' }, { status: 404 })
  }

  return NextResponse.json(movers, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
  })
}
