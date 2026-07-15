import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_MARKET } from '@/lib/constants'
import { todayISO } from '@/lib/server/dateUtils'
import { bustCacheOnReload } from '@/lib/server/freshReload'
import { getMarketOverview } from '@/lib/server/marketOverview'

export const maxDuration = 60;
export const revalidate = 3600;

const SEAFOOD_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
};

const VEG_FRUIT_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
};

function overviewErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function cacheHeadersForCategory(category: string): Record<string, string> | undefined {
  if (category === 'seafood' || category === 'meat') return SEAFOOD_CACHE_HEADERS
  return VEG_FRUIT_CACHE_HEADERS
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const market = searchParams.get('market') || DEFAULT_MARKET
  const date = searchParams.get('date') || todayISO()
  const category = searchParams.get('category') || 'vegetable'

  if (category === 'meat') {
    bustCacheOnReload(req, ['moa-livestock-prices'])
  } else if (category === 'seafood') {
    bustCacheOnReload(req, ['moa-latest-seafood-data'])
  }

  const result = await getMarketOverview({
    market,
    category,
    asOf: date,
    days: 7,
  })

  if (!result.overview) {
    const message = result.error || '查無市場概況資料'
    const status =
      result.error && !result.error.includes('查無') ? 502 : 404
    return overviewErrorResponse(message, status)
  }

  return NextResponse.json(result.overview, {
    headers: cacheHeadersForCategory(category),
  })
}
