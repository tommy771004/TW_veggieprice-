import { NextRequest, NextResponse } from 'next/server'
import { fetchSearchRecords } from '@/lib/server/moa'
import { todayISO } from '@/lib/server/dateUtils'
import { toCompactPricePayload } from '@/lib/priceDto'

export const revalidate = 3600
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const crop = searchParams.get('crop') || ''
  const market = searchParams.get('market') || ''
  const type = searchParams.get('type') || ''
  const date = searchParams.get('date') || todayISO()
  const startDate = searchParams.get('startDate') || date
  const endDate = searchParams.get('endDate') || date
  const pageParam = searchParams.get('page')
  const limitParam = searchParams.get('limit') || '20'
  const format = searchParams.get('format') // 'array' for compact DTO

  const { records, error } = await fetchSearchRecords({
    cropName: crop,
    market,
    date,
    startDate,
    endDate,
    marketType: type,
  })

  if (error) {
    // Distinguish a genuine upstream failure (502) from a not-found query (404).
    const status = error.includes('查無') ? 404 : 502
    return NextResponse.json({ error }, { status })
  }

  if (pageParam) {
    const page = parseInt(pageParam, 10)
    const limit = parseInt(limitParam, 10)
    if (!isNaN(page) && page > 0) {
      const startIndex = (page - 1) * limit
      const paginatedData = records.slice(startIndex, startIndex + limit)
      // Column order and field set live in @/lib/priceDto so the search page
      // decodes exactly what is encoded here (priceChange included).
      const compact =
        format === 'array' ? toCompactPricePayload(paginatedData) : null
      return NextResponse.json({
        data: compact ? compact.data : paginatedData,
        keys: compact ? compact.keys : undefined,
        total: records.length,
        page,
        hasNextPage: startIndex + limit < records.length
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      })
    }
  }

  return NextResponse.json(
    format === 'array' ? toCompactPricePayload(records) : records,
    {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    },
  )
}
