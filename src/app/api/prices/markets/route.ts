import { NextRequest, NextResponse } from 'next/server'
import { fetchSearchRecords } from '@/lib/server/moa'
import { todayISO } from '@/lib/server/dateUtils'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const cropName = searchParams.get('crop') || ''
  const date = searchParams.get('date') || todayISO()
  const marketType = searchParams.get('type') || ''

  // Pass only the target date — fetchSearchRecords does its own 7-day look-back to
  // find the previous trading day (holiday-aware) and computes priceChange per
  // crop+market. Passing an explicit wide startDate would put every recent day in
  // the "current" partition and leave no baseline, forcing priceChange to 0.
  const { records: allRecords, error } = await fetchSearchRecords({
    cropName,
    date,
    marketType,
  })

  if (error) {
    return NextResponse.json({ error }, { status: 502 })
  }

  if (allRecords.length === 0) {
    return NextResponse.json({ error: '查無跨市場比價資料' }, { status: 404 })
  }

  // fetchSearchRecords already collapses each crop+market to its latest traded day
  // and computes a holiday-aware priceChange against the prior trading day, so reuse
  // that value directly. Skip 休市 / 0-price placeholder rows and dedupe to one row
  // per market (keep the most recent when a crop name matches multiple crop codes).
  const byMarket = new Map<string, { date: string; avgPrice: number; priceChange: number }>()
  for (const r of allRecords) {
    if (!r.marketName || !r.date || !(r.avgPrice > 0)) continue
    const existing = byMarket.get(r.marketName)
    if (!existing || r.date > existing.date) {
      byMarket.set(r.marketName, {
        date: r.date,
        avgPrice: r.avgPrice,
        priceChange: r.priceChange ?? 0,
      })
    }
  }

  const comparison = Array.from(byMarket.entries()).map(([marketName, rec]) => ({
    marketName,
    avgPrice: rec.avgPrice,
    priceChange: rec.priceChange,
  }))

  return NextResponse.json(comparison, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
  })
}
