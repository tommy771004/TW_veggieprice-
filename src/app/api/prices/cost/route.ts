import { NextRequest, NextResponse } from 'next/server'
import { fetchProductCostInsight } from '@/lib/server/moa'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const cropName = searchParams.get('crop') || ''

  if (!cropName.trim()) {
    return NextResponse.json({ error: '缺少 crop 參數', insight: null }, { status: 400 })
  }

  const result = await fetchProductCostInsight(cropName)

  if (result.error) {
    return NextResponse.json({ error: result.error, insight: null }, { status: 502 })
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
    },
  })
}
