import { unstable_cache } from 'next/cache'
import type { DailyForecast } from '@/lib/types'
import { parseCwaResponse, mergeForecastPeriods, taipeiISODate } from './cwaForecast'

const CWA_FETCH_TIMEOUT_MS = Number(process.env.CWA_FETCH_TIMEOUT_MS ?? '10000')
const CWA_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091'

async function fetchWeeklyForecastUncached(county: string): Promise<DailyForecast[]> {
  const apiKey = process.env.CWA_API_KEY
  if (!apiKey || !county) return []

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CWA_FETCH_TIMEOUT_MS)

  try {
    const params = new URLSearchParams({
      Authorization: apiKey,
      locationName: county,
      format: 'JSON',
    })
    const response = await fetch(`${CWA_BASE}?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) {
      console.warn(`[cwa] weekly forecast HTTP ${response.status} for county=${county}`)
      return []
    }
    const json = await response.json()
    const periods = parseCwaResponse(json, county)
    return mergeForecastPeriods(periods, taipeiISODate(new Date()))
  } catch (error) {
    console.warn(`[cwa] weekly forecast failed for county=${county}: ${error instanceof Error ? error.message : String(error)}`)
    return []
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchWeeklyForecast(county: string): Promise<DailyForecast[]> {
  const cachedFn = unstable_cache(
    () => fetchWeeklyForecastUncached(county),
    ['cwa-weekly-forecast-v1', county],
    { revalidate: 3600 },
  )
  try {
    return await cachedFn()
  } catch {
    return []
  }
}
