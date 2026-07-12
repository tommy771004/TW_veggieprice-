// Pure parsing/merge helpers for CWA F-C0032-005 (一週縣市天氣預報).
// Deliberately zero-import so this file can run standalone under `node --test`
// (next/cache and the `@/*` path alias only resolve inside the Next.js build).

export interface CwaForecastPeriod {
  startTime: string // "YYYY-MM-DD HH:mm:ss"
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
    const key = String(t?.startTime ?? '')
    if (key) map.set(key, t)
  }
  return map
}

export function parseCwaResponse(json: unknown): CwaForecastPeriod[] {
  const elements = (json as any)?.records?.location?.[0]?.weatherElement
  if (!Array.isArray(elements)) return []

  const findTimes = (name: string): any[] =>
    elements.find((el: any) => el?.elementName === name)?.time ?? []

  const wxTimes = findTimes('Wx')
  const maxTByStart = indexByStartTime(findTimes('MaxT'))
  const minTByStart = indexByStartTime(findTimes('MinT'))
  const popByStart = indexByStartTime(findTimes('PoP12h'))

  return wxTimes
    .map((wxTime: any): CwaForecastPeriod => {
      const startTime = String(wxTime?.startTime ?? '')
      return {
        startTime,
        endTime: String(wxTime?.endTime ?? ''),
        wx: String(wxTime?.parameter?.parameterName ?? ''),
        maxT: toNumber(maxTByStart.get(startTime)?.parameter?.parameterName),
        minT: toNumber(minTByStart.get(startTime)?.parameter?.parameterName),
        pop: toNumber(popByStart.get(startTime)?.parameter?.parameterName),
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
