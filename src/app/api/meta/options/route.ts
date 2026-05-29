import { NextResponse } from 'next/server'
import { fetchMarketOptions } from '@/lib/server/moa'

export async function GET() {
  const result = await fetchMarketOptions()

  if (result.error) {
    return NextResponse.json({ error: result.error, ...result }, { status: 502 })
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  })
}
