import { NextRequest, NextResponse } from 'next/server'
import { fetchCurrentWeather } from '@/lib/server/cwa'
import { resolveCountyFromTownship } from '@/lib/server/townshipCountyMap'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  let county = searchParams.get('county')

  if (!county) {
    return NextResponse.json({ error: 'Missing county parameter' }, { status: 400 })
  }

  // Use only the first origin if multiple are provided
  const rawOrigin = county.split('、')[0].trim()
  
  const VALID_COUNTIES = [
    '台北', '新北', '基隆', '桃園', '新竹', '苗栗', 
    '台中', '彰化', '南投', '雲林', '嘉義', '台南', 
    '高雄', '屏東', '宜蘭', '花蓮', '台東', '澎湖', 
    '金門', '連江'
  ]

  // Prefer a direct county keyword; otherwise resolve a district/township
  // (e.g. 五股區 → 新北) so origins at sub-county granularity still get weather.
  const matchedCounty = VALID_COUNTIES.find(c => rawOrigin.includes(c)) ?? resolveCountyFromTownship(rawOrigin)
  if (!matchedCounty) {
     return NextResponse.json({ error: 'No matching county found in origin' }, { status: 404 })
  }
  county = matchedCounty

  const observation = await fetchCurrentWeather(county)
  if (!observation) {
    return NextResponse.json({ error: 'No CWA weather data found for this county' }, { status: 404 })
  }

  return NextResponse.json(observation, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' },
  })
}
