import { NextRequest, NextResponse } from 'next/server'
import { fetchSearchRecords } from '@/lib/server/moa'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const crop = searchParams.get('crop') || ''
  const market = searchParams.get('market') || ''
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const startDate = searchParams.get('startDate') || date
  const endDate = searchParams.get('endDate') || date

  const { records, error } = await fetchSearchRecords({
    cropName: crop,
    market,
    date,
    startDate,
    endDate,
  })

  if (error) {
    // Distinguish a genuine upstream failure (502) from a not-found query (404).
    const status = error.includes('查無') ? 404 : 502
    return NextResponse.json({ error }, { status })
  }

  return NextResponse.json(records)
}
