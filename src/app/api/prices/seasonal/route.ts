import { NextResponse } from 'next/server'
import { fetchSeasonalCrops } from '@/lib/server/moa'

export async function GET() {
  const { crops, error } = await fetchSeasonalCrops()
  if (crops.length === 0) {
    const status = error?.includes('查無') ? 404 : 502
    return NextResponse.json({ error: error ?? '查無本月交易資料' }, { status })
  }
  return NextResponse.json(crops, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
  })
}
