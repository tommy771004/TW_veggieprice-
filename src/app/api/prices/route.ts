import { NextRequest, NextResponse } from 'next/server'
import { fetchSearchRecords } from '@/lib/server/moa'
import { todayISO } from '@/lib/server/dateUtils'

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

  const formatRecords = (recs: any[]) => {
    if (format === 'array') {
      const formatted = {
        keys: ['cropCode', 'cropName', 'marketName', 'grade', 'upperPrice', 'middlePrice', 'lowerPrice', 'avgPrice', 'transWeight', 'date'],
        data: recs.map(r => [
          r.cropCode, r.cropName, r.marketName, r.grade, 
          Math.round(r.upperPrice*10)/10, Math.round(r.middlePrice*10)/10, Math.round(r.lowerPrice*10)/10, Math.round(r.avgPrice*10)/10, 
          Math.round(r.transWeight), r.date
        ])
      }
      return formatted as any
    }
    return recs as any
  }

  if (pageParam) {
    const page = parseInt(pageParam, 10)
    const limit = parseInt(limitParam, 10)
    if (!isNaN(page) && page > 0) {
      const startIndex = (page - 1) * limit
      const paginatedData = records.slice(startIndex, startIndex + limit)
      return NextResponse.json({
        data: format === 'array' ? formatRecords(paginatedData).data : paginatedData,
        keys: format === 'array' ? formatRecords(paginatedData).keys : undefined,
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

  return NextResponse.json(formatRecords(records), {
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
    },
  })
}
