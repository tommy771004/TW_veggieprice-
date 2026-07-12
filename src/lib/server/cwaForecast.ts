// Pure parsing/merge helpers for CWA F-D0047-091 (鄉鎮天氣預報-未來1週天氣預報).
// Deliberately zero-import so this file can run standalone under `node --test`
// (next/cache and the `@/*` path alias only resolve inside the Next.js build).

export interface CwaForecastPeriod {
  startTime: string // ISO 8601 with offset, e.g. "2026-07-12T06:00:00+08:00"
  endTime: string
  wx: string
  maxT: number | null
  minT: number | null
  pop: number | null
}

export interface CwaDailyForecast {
  date: string
  maxT: number | null
  minT: number | null
  pop: number | null
  wxText: string
  icon: string
}

export function mapWxToIcon(wxText: string): string {
  if (wxText.includes('雷')) return 'thunderstorm'
  if (wxText.includes('雨')) return 'rainy'
  if (wxText.includes('多雲')) return 'partly_cloudy_day'
  if (wxText.includes('陰')) return 'cloud'
  return 'sunny'
}

export function taipeiISODate(date: Date): string {
  // Taiwan has no DST, always UTC+8.
  const taipei = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return taipei.toISOString().slice(0, 10)
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function indexByStartTime(times: any[]): Map<string, any> {
  const map = new Map<string, any>()
  for (const t of times) {
    const key = String(t?.StartTime ?? '')
    if (key) map.set(key, t)
  }
  return map
}

// Each Time entry's ElementValue is an array (always length 1 in practice) whose single
// object carries an element-specific key (MaxTemperature / MinTemperature /
// ProbabilityOfPrecipitation / Weather+WeatherCode).
function firstElementValue(time: any): any {
  return Array.isArray(time?.ElementValue) ? time.ElementValue[0] : undefined
}

export function parseCwaResponse(json: unknown, county: string): CwaForecastPeriod[] {
  const locations = (json as any)?.records?.Locations?.[0]?.Location
  if (!Array.isArray(locations)) return []

  const location = locations.find((loc: any) => loc?.LocationName === county)
  if (!location) return []

  const elements = location?.WeatherElement
  if (!Array.isArray(elements)) return []

  const findTimes = (name: string): any[] =>
    elements.find((el: any) => el?.ElementName === name)?.Time ?? []

  const wxTimes = findTimes('天氣現象')
  const maxTByStart = indexByStartTime(findTimes('最高溫度'))
  const minTByStart = indexByStartTime(findTimes('最低溫度'))
  const popByStart = indexByStartTime(findTimes('12小時降雨機率'))

  return wxTimes
    .map((wxTime: any): CwaForecastPeriod => {
      const startTime = String(wxTime?.StartTime ?? '')
      const wxValue = firstElementValue(wxTime)
      const maxTValue = firstElementValue(maxTByStart.get(startTime))
      const minTValue = firstElementValue(minTByStart.get(startTime))
      const popValue = firstElementValue(popByStart.get(startTime))
      return {
        startTime,
        endTime: String(wxTime?.EndTime ?? ''),
        wx: String(wxValue?.Weather ?? ''),
        maxT: toNumber(maxTValue?.MaxTemperature),
        minT: toNumber(minTValue?.MinTemperature),
        pop: toNumber(popValue?.ProbabilityOfPrecipitation),
      }
    })
    .filter((p: CwaForecastPeriod) => p.startTime.length > 0)
}

export function mergeForecastPeriods(periods: CwaForecastPeriod[], todayISO: string): CwaDailyForecast[] {
  const byDate = new Map<string, CwaForecastPeriod[]>()
  for (const period of periods) {
    const date = period.startTime.slice(0, 10)
    if (!date) continue
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(period)
  }

  const endISO = addDaysISO(todayISO, 6)
  const dates = Array.from(byDate.keys())
    .filter((date) => date >= todayISO && date <= endISO)
    .sort()

  return dates.map((date) => {
    const dayPeriods = byDate.get(date)!
    const maxTs = dayPeriods.map((p) => p.maxT).filter((v): v is number => v !== null)
    const minTs = dayPeriods.map((p) => p.minT).filter((v): v is number => v !== null)
    const pops = dayPeriods.map((p) => p.pop).filter((v): v is number => v !== null)

    // Prefer the daytime (06:00-18:00) period's Wx text; fall back to whatever is available
    // (e.g. only the night period remains once "today"'s daytime slot has already passed).
    const daytime = dayPeriods.find((p) => p.startTime.slice(11, 13) < '18') ?? dayPeriods[0]

    return {
      date,
      maxT: maxTs.length > 0 ? Math.max(...maxTs) : null,
      minT: minTs.length > 0 ? Math.min(...minTs) : null,
      pop: pops.length > 0 ? Math.max(...pops) : null,
      wxText: daytime.wx,
      icon: mapWxToIcon(daytime.wx),
    }
  })
}
