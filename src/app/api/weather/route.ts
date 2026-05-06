import { NextRequest, NextResponse } from 'next/server'
import { fetchMarketWeatherObservations } from '@/lib/server/moa'

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

  const matchedCounty = VALID_COUNTIES.find(c => rawOrigin.includes(c))
  if (!matchedCounty) {
     return NextResponse.json({ error: 'No matching county found in origin' }, { status: 404 })
  }
  county = matchedCounty

  try {
    const weatherRes = await fetchMarketWeatherObservations(county, 40)
    if (weatherRes.error) {
      return NextResponse.json({ error: weatherRes.error }, { status: 502 })
    }

    const observations = weatherRes.items

    if (observations.length === 0) {
      return NextResponse.json({ error: 'No weather data found for this county' }, { status: 404 })
    }

    // Average the valid data
    let totalTemp = 0, validTempCount = 0
    let totalHumd = 0, validHumdCount = 0
    let totalRain = 0, validRainCount = 0

    observations.forEach(obs => {
      if (obs.temperatureC !== null && obs.temperatureC > -10 && obs.temperatureC < 50) { 
        totalTemp += obs.temperatureC; validTempCount++ 
      }
      if (obs.humidityPct !== null && obs.humidityPct >= 0 && obs.humidityPct <= 100) { 
        totalHumd += obs.humidityPct; validHumdCount++ 
      }
      if (obs.rainfallMm !== null && obs.rainfallMm >= 0 && obs.rainfallMm < 500) { 
        totalRain += obs.rainfallMm; validRainCount++ 
      }
    })

    const avgTemp = validTempCount > 0 ? Math.round(totalTemp / validTempCount) : null
    const avgHumd = validHumdCount > 0 ? Math.round(totalHumd / validHumdCount) : null
    const avgRain = validRainCount > 0 ? Math.round(totalRain / validRainCount) : null

    return NextResponse.json({
      county,
      temp: avgTemp,
      humidity: avgHumd,
      rainfall: avgRain
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
