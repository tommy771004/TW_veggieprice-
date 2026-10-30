import { NextRequest, NextResponse } from 'next/server'
import { fetchSearchRecords, fetchMarketData } from '@/lib/server/moa'
import type { ProducePrice } from '@/lib/types'

export const revalidate = 120

// Batch snapshot endpoint for the watchlist. Replaces the client-side N+1 pattern
// (2 requests per watched crop) with a single request. Prices for every crop come
// from one cached all-crops aggregate (no per-crop upstream calls); 7-day sparklines
// use the per-crop history cache. Crops whose MOA name differs from the stored name
// (no alias map exists app-wide, e.g. 高麗菜/甘藍) degrade to price 0 — same as the
// previous per-crop behavior — rather than erroring.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const cropsParam = searchParams.get('crops') || ''
  const crops = [...new Set(cropsParam.split(',').map((c) => c.trim()).filter(Boolean))].slice(0, 50)

  if (crops.length === 0) {
    return NextResponse.json({ snapshots: {} })
  }

  const [priceRes, histories] = await Promise.all([
    // One cached aggregate pull covers prices + holiday-aware priceChange for all crops.
    fetchSearchRecords({}),
    // Sparklines come from the per-crop history cache (parallel, independently cached).
    Promise.all(
      crops.map(async (crop) => {
        try {
          const result = await fetchMarketData(crop, '', '1W')
          const series = result.error
            ? []
            : result.data
                .filter((p) => p.avgPrice !== null)
                .slice(-7)
                .map((p) => p.avgPrice as number)
          return [crop, series] as const
        } catch {
          return [crop, [] as number[]] as const
        }
      }),
    ),
  ])

  const historyByCrop = new Map(histories)

  // Representative record per requested crop (highest traded volume), matched by
  // substring so variant suffixes (e.g. "芒果-愛文") still resolve.
  const bestByCrop = new Map<string, ProducePrice>()
  if (!priceRes.error) {
    for (const r of priceRes.records) {
      if (!(r.avgPrice > 0)) continue
      const matched = crops.find(
        (c) => r.cropName === c || r.cropName.includes(c) || c.includes(r.cropName),
      )
      if (!matched) continue
      const existing = bestByCrop.get(matched)
      if (!existing || r.transWeight > existing.transWeight) {
        bestByCrop.set(matched, r)
      }
    }
  }

  const snapshots: Record<
    string,
    { price: number; change: number; history: number[] }
  > = {}

  for (const crop of crops) {
    const rec = bestByCrop.get(crop)
    const history = historyByCrop.get(crop) ?? []
    const price = rec?.avgPrice ?? 0
    snapshots[crop] = {
      price,
      change: rec?.priceChange ?? 0,
      history: history.length > 0 ? history : [price],
    }
  }

  return NextResponse.json(
    { snapshots },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } },
  )
}
