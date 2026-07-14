import { unstable_cache } from 'next/cache'
import type { DailyForecast } from '@/lib/types'
import { parseCwaResponse, mergeForecastPeriods, taipeiISODate } from './cwaForecast'
import {
  aggregateCwaCountyWeather,
  mapCwaCountyWeatherObservations,
  type CwaCurrentWeather,
  type CwaObservationStation,
} from './cwaObservation'
import type { MarketWeatherObservation } from '@/lib/types'

const CWA_FETCH_TIMEOUT_MS = Number(process.env.CWA_FETCH_TIMEOUT_MS ?? '10000')
const CWA_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091'
const CWA_OBSERVATION_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0003-001'

async function fetchCwaResponse(url: string): Promise<Response> {
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort()
      reject(new Error(`CWA request timed out after ${CWA_FETCH_TIMEOUT_MS}ms`))
    }, CWA_FETCH_TIMEOUT_MS)
  })

  try {
    return await Promise.race([
      fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }),
      timeout,
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

async function fetchWeeklyForecastUncached(county: string): Promise<DailyForecast[]> {
  const apiKey = process.env.CWA_API_KEY
  if (!apiKey || !county) return []

  try {
    const params = new URLSearchParams({
      Authorization: apiKey,
      // locationName is accepted by this endpoint but silently ignored — F-D0047-091 always
      // returns all 22 counties; parseCwaResponse(json, county) does the real filtering.
      locationName: county,
      format: 'JSON',
    })
    const response = await fetchCwaResponse(`${CWA_BASE}?${params}`)
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

async function fetchCwaObservationStationsUncached(county: string): Promise<CwaObservationStation[]> {
  const apiKey = process.env.CWA_API_KEY
  if (!apiKey || !county) throw new Error('CWA API key or county is missing')

  try {
    const params = new URLSearchParams({
      Authorization: apiKey,
      format: 'JSON',
    })
    const response = await fetchCwaResponse(`${CWA_OBSERVATION_BASE}?${params}`)
    if (!response.ok) throw new Error(`CWA current observation HTTP ${response.status}`)

    const json = await response.json() as { records?: { Station?: CwaObservationStation[] } }
    return json.records?.Station ?? []
  } catch (error) {
    console.warn(`[cwa] current observation failed for county=${county}: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

async function fetchCwaObservationStations(county: string): Promise<CwaObservationStation[]> {
  const cachedFn = unstable_cache(
    () => fetchCwaObservationStationsUncached(county),
    ['cwa-current-observation-v1', county],
    { revalidate: 600 },
  )

  return cachedFn()
}

export async function fetchCurrentWeather(county: string): Promise<CwaCurrentWeather | null> {
  try {
    return aggregateCwaCountyWeather(county, await fetchCwaObservationStations(county))
  } catch {
    return null
  }
}

export async function fetchCurrentWeatherObservations(
  county: string,
  limit = 20,
): Promise<MarketWeatherObservation[]> {
  try {
    return mapCwaCountyWeatherObservations(
      county,
      await fetchCwaObservationStations(county),
      limit,
    )
  } catch {
    return []
  }
}
