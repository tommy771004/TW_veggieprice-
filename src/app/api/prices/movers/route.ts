import { NextResponse } from 'next/server'
import { getCropEmoji } from '@/lib/utils'
import { fetchMarketWindowRecords } from '@/lib/server/moa'
import { subtractDays, todayISO } from '@/lib/server/dateUtils'

export async function GET() {
  const today = todayISO()
  const rangeStart = subtractDays(today, 7)

  // Single bulk range fetch (already cached at 120 s) instead of 7 parallel day queries.
  const { records: allRecords, error } = await fetchMarketWindowRecords('全部市場', rangeStart, today)

  if (error || allRecords.length === 0) {
    return NextResponse.json({ error: error ?? '查無波動排行資料' }, { status: error ? 502 : 404 })
  }

  // Find the two most recent trading days from the returned data.
  const tradingDates = [...new Set(allRecords.map((r) => r.date))]
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))

  if (tradingDates.length === 0) {
    return NextResponse.json({ error: '查無波動排行資料' }, { status: 404 })
  }

  const latestDate = tradingDates[0]
  const prevDate = tradingDates[1] ?? null

  const latestRecords = allRecords.filter((r) => r.date === latestDate)
  const yestMap: Record<string, number> = {}
  if (prevDate) {
    allRecords
      .filter((r) => r.date === prevDate)
      .forEach((record) => {
        if (record.avgPrice > 0) {
          yestMap[`${record.cropName}_${record.marketName}`] = record.avgPrice
        }
      })
  }

  const movers = latestRecords
    .map((record) => {
      const key = `${record.cropName}_${record.marketName}`
      const currentPrice = record.avgPrice || 0
      const yest = yestMap[key]
      const change = yest && yest > 0 ? ((currentPrice - yest) / yest) * 100 : 0
      return {
        cropCode: record.cropCode,
        cropName: record.cropName,
        marketName: record.marketName,
        grade: record.grade,
        currentPrice,
        priceChange: Math.round(change * 10) / 10,
        emoji: getCropEmoji(record.cropName),
      }
    })
    .filter((m) => m.currentPrice > 0)
    .sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange))
    .slice(0, 6)

  if (movers.length === 0) {
    return NextResponse.json({ error: '查無波動排行資料' }, { status: 404 })
  }

  return NextResponse.json(movers, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
  })
}
