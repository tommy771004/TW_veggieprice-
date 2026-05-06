import { NextResponse } from 'next/server'
import { fetchLivestockPrices } from '@/lib/server/moa'

export async function GET() {
  try {
    const data = await fetchLivestockPrices()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '無法取得畜產品行情' },
      { status: 502 }
    )
  }
}
