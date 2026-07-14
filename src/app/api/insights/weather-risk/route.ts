import { NextRequest, NextResponse } from 'next/server'
import { resolveCountyFromMarketName } from '@/lib/server/moa'
import { fetchCurrentWeatherObservations } from '@/lib/server/cwa'
import type { MarketWeatherRiskSummary } from '@/lib/types'
import { DEFAULT_MARKET } from '@/lib/constants'

export const maxDuration = 60;
export const dynamic = 'force-dynamic'

function buildRiskSummary(market: string, county: string, observations: {
  temperatureC: number | null
  rainfallMm: number | null
  humidityPct: number | null
}[]): MarketWeatherRiskSummary {
  // Filter out implausible sensor readings before computing stats
  const temperatures = observations
    .map((item) => item.temperatureC)
    .filter((v): v is number => v !== null && v > -10 && v < 50)
  const rainfalls = observations
    .map((item) => item.rainfallMm)
    .filter((v): v is number => v !== null && v >= 0 && v < 500)
  const humidities = observations
    .map((item) => item.humidityPct)
    .filter((v): v is number => v !== null && v >= 0 && v <= 100)

  const maxTemperatureC = temperatures.length > 0 ? Math.max(...temperatures) : null
  const minTemperatureC = temperatures.length > 0 ? Math.min(...temperatures) : null
  const maxRainfallMm = rainfalls.length > 0 ? Math.max(...rainfalls) : null
  const avgHumidityPct = humidities.length > 0
    ? Math.round((humidities.reduce((sum, value) => sum + value, 0) / humidities.length) * 10) / 10
    : null

  let score = 0
  const reasons: string[] = []

  // Heat risk
  if (maxTemperatureC !== null && maxTemperatureC >= 35) {
    score += 40
    reasons.push(`高溫 ${Math.round(maxTemperatureC)}°C，蔬果保鮮與採收運輸風險上升`)
  } else if (maxTemperatureC !== null && maxTemperatureC >= 33) {
    score += 20
    reasons.push(`偏高溫 ${Math.round(maxTemperatureC)}°C，蔬果保鮮壓力增加`)
  }

  // Cold/frost risk — affects leafy vegetables and tropical fruits
  if (minTemperatureC !== null && minTemperatureC < 5) {
    score += 40
    reasons.push(`低溫 ${Math.round(minTemperatureC)}°C，霜害風險高，葉菜類供應可能銳減`)
  } else if (minTemperatureC !== null && minTemperatureC < 10) {
    score += 20
    reasons.push(`偏低溫 ${Math.round(minTemperatureC)}°C，敏感作物生長受阻，行情波動風險提高`)
  }

  // Rainfall risk
  if (maxRainfallMm !== null && maxRainfallMm >= 50) {
    score += 40
    reasons.push(`強降雨 ${maxRainfallMm.toFixed(1)} mm，供應量與運輸可能受影響`)
  } else if (maxRainfallMm !== null && maxRainfallMm >= 30) {
    score += 20
    reasons.push(`降雨偏高 ${maxRainfallMm.toFixed(1)} mm，短期行情不確定性提高`)
  }

  // Humidity risk
  if (avgHumidityPct !== null && avgHumidityPct >= 85) {
    score += 10
    reasons.push(`濕度偏高 ${avgHumidityPct.toFixed(1)}%，儲運耗損風險增加`)
  }

  score = Math.min(score, 100)

  const level: MarketWeatherRiskSummary['level'] = score >= 70
    ? 'high'
    : score >= 35
      ? 'medium'
      : 'low'

  if (reasons.length === 0) {
    reasons.push('近期天氣條件平穩，價格波動風險較低')
  }

  return {
    market,
    county,
    score,
    level,
    reasons,
    metrics: {
      maxTemperatureC,
      minTemperatureC,
      maxRainfallMm,
      avgHumidityPct,
    },
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const market = searchParams.get('market') || DEFAULT_MARKET
  const county = searchParams.get('county') || resolveCountyFromMarketName(market)

  const weatherItems = await fetchCurrentWeatherObservations(county, 40)

  if (weatherItems.length === 0) {
    console.log(`[API weather-risk] No CWA weather observations for county: ${county}`)
    // Do not fabricate readings — a risk score built from synthetic data
    // would misrepresent actual conditions. Callers already treat a
    // failed/errored request as "no weather risk data available".
    return NextResponse.json({ error: '查無天氣測站資料' }, { status: 404 })
  }

  const summary = buildRiskSummary(market, county, weatherItems)

  return NextResponse.json(summary, {
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  })
}
