import type { MarketWeatherObservation } from '@/lib/types'

export interface CwaObservationStation {
  StationId?: string
  StationName?: string
  ObsTime?: {
    DateTime?: string
  }
  GeoInfo?: {
    CountyName?: string
  }
  WeatherElement?: {
    AirTemperature?: unknown
    RelativeHumidity?: unknown
    Now?: {
      Precipitation?: unknown
    }
  }
}

export interface CwaCurrentWeather {
  county: string
  temp: number | null
  humidity: number | null
  rainfall: number | null
}

function normalizeCounty(value: string): string {
  return value.replace(/臺/g, '台').replace(/[市縣]$/, '').trim()
}

function parseObservationNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue < -90) return null
  return numberValue
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

export function aggregateCwaCountyWeather(
  county: string,
  stations: CwaObservationStation[],
): CwaCurrentWeather | null {
  const normalizedCounty = normalizeCounty(county)
  if (!normalizedCounty) return null

  const temperatures: number[] = []
  const humidities: number[] = []
  const rainfalls: number[] = []

  for (const station of stations) {
    if (normalizeCounty(station.GeoInfo?.CountyName ?? '') !== normalizedCounty) continue

    const temperature = parseObservationNumber(station.WeatherElement?.AirTemperature)
    const humidity = parseObservationNumber(station.WeatherElement?.RelativeHumidity)
    const rainfall = parseObservationNumber(station.WeatherElement?.Now?.Precipitation)

    if (temperature !== null && temperature > -10 && temperature < 50) temperatures.push(temperature)
    if (humidity !== null && humidity >= 0 && humidity <= 100) humidities.push(humidity)
    if (rainfall !== null && rainfall >= 0 && rainfall < 500) rainfalls.push(rainfall)
  }

  if (temperatures.length === 0 && humidities.length === 0 && rainfalls.length === 0) return null

  return {
    county: normalizedCounty,
    temp: average(temperatures),
    humidity: average(humidities),
    rainfall: average(rainfalls),
  }
}

export function mapCwaCountyWeatherObservations(
  county: string,
  stations: CwaObservationStation[],
  limit: number,
): MarketWeatherObservation[] {
  const normalizedCounty = normalizeCounty(county)
  if (!normalizedCounty) return []

  return stations
    .filter((station) => normalizeCounty(station.GeoInfo?.CountyName ?? '') === normalizedCounty)
    .map((station) => ({
      stationName: station.StationName ?? station.StationId ?? 'CWA 測站',
      county: normalizedCounty,
      observedAt: station.ObsTime?.DateTime ?? '',
      temperatureC: parseObservationNumber(station.WeatherElement?.AirTemperature),
      rainfallMm: parseObservationNumber(station.WeatherElement?.Now?.Precipitation),
      humidityPct: parseObservationNumber(station.WeatherElement?.RelativeHumidity),
    }))
    .filter((station) =>
      (station.temperatureC !== null && station.temperatureC > -10 && station.temperatureC < 50)
      || (station.rainfallMm !== null && station.rainfallMm >= 0 && station.rainfallMm < 500)
      || (station.humidityPct !== null && station.humidityPct >= 0 && station.humidityPct <= 100),
    )
    .sort((a, b) => a.stationName.localeCompare(b.stationName, 'zh-Hant'))
    .slice(0, Math.max(1, limit))
}
