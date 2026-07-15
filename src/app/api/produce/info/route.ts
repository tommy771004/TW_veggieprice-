import { NextRequest, NextResponse } from 'next/server'
import { fetchTraceabilitySummary } from '@/lib/server/moa'
import { resolveCountyFromTownship } from '@/lib/server/townshipCountyMap'
import { resolveCountyFromMarketName } from '@/lib/server/marketCountyMap'
import { getCropBaseInfo } from '@/lib/cropInfo'
import type { CropInfo } from '@/lib/types'

async function resolveOrigin(cropName: string, staticOrigin: string): Promise<string> {
  const { items } = await fetchTraceabilitySummary(cropName, 10)
  if (items.length === 0) return staticOrigin

  const countyCounts = new Map<string, number>()
  for (const item of items) {
    // Normalize dirty traceability county fields (e.g. 雲林縣, 臺南市, 五股區,
    // "新北市淡水") down to a clean short county name.
    const raw = (item.county ?? '').replace(/臺/g, '台').trim()
    // marketCountyMap knows urban districts + keywords (淡水/蘆洲/…); townshipMap
    // covers rural townships (五股/三星/玉井/…); finally strip any lingering suffix.
    const full = resolveCountyFromMarketName(raw).replace(/臺/g, '台').replace(/[市縣]$/, '')
    const county = full || resolveCountyFromTownship(raw) || raw.replace(/[市縣區鄉鎮]$/, '')
    if (county && county !== '未知' && county.length >= 2) {
      countyCounts.set(county, (countyCounts.get(county) ?? 0) + 1)
    }
  }

  // Require at least 2 distinct counties for dynamic origin to be reliable
  if (countyCounts.size < 2) return staticOrigin

  const top = [...countyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([county]) => county)

  return top.join('、')
}

export async function GET(req: NextRequest) {
  const cropName = req.nextUrl.searchParams.get('crop')?.trim() ?? ''
  if (!cropName) {
    return NextResponse.json({ error: '請提供作物名稱' }, { status: 400 })
  }

  const base = getCropBaseInfo(cropName)
  if (!base) {
    // No curated intro — client should hide the crop-brief card (no placeholders).
    return NextResponse.json(
      { error: '查無此作物簡介' },
      {
        status: 404,
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
      },
    )
  }

  let origin = base.staticOrigin
  try {
    origin = await resolveOrigin(cropName, base.staticOrigin)
  } catch {
    // keep static origin on error
  }

  const body: CropInfo = { feature: base.feature, season: base.season, origin }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
  })
}
