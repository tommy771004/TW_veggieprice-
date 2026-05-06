import { NextRequest, NextResponse } from 'next/server'
import { fetchTraceabilitySummary } from '@/lib/server/moa'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const cropName = searchParams.get('crop') || ''
  const requestedLimit = Number(searchParams.get('limit') || '5')
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(Math.floor(requestedLimit), 10))
    : 5

  if (!cropName.trim()) {
    return NextResponse.json({ error: '缺少 crop 參數', items: [] }, { status: 400 })
  }

  const result = await fetchTraceabilitySummary(cropName, limit)

  if (result.error) {
    return NextResponse.json(
      {
        items: [],
        degraded: true,
        warning: `traceability upstream unavailable: ${result.error}`,
      },
      {
        status: 200,
        headers: {
          // Keep degraded responses short-lived so recovery is picked up quickly.
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
    },
  })
}
