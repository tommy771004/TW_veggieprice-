# 休市日行事曆 7 日天氣預報圖示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a per-day weather icon (+ high/low temp) for the next 7 days inside the 休市日 calendar grid in `InsightsClient.tsx`, sourced from CWA's `F-C0032-005` weekly county forecast, mapped by the selected market's county.

**Architecture:** A new zero-import pure module (`cwaForecast.ts`) parses the raw CWA JSON and merges its 12-hour day/night periods into one record per calendar date; a thin I/O shell (`cwa.ts`) fetches + caches that data; a new route handler exposes it by `market`; the client fetches it once per market change and looks it up by date while rendering the existing calendar grid.

**Tech Stack:** Next.js Route Handlers, `unstable_cache` (`next/cache`), native `fetch`, Node's built-in `node:test` test runner (no Jest/Vitest in this repo).

**Spec:** `docs/superpowers/specs/2026-07-12-calendar-weather-forecast-design.md`

---

### Task 1: Add `DailyForecast` / `MarketWeatherForecast` types

**Files:**
- Modify: `src/lib/types.ts:144-156` (insert after the existing `MarketWeatherRiskSummary` interface)

- [ ] **Step 1: Add the two interfaces**

Insert immediately after the closing `}` of `MarketWeatherRiskSummary` (currently ends at line 156):

```ts
export interface DailyForecast {
  date: string        // ISO yyyy-mm-dd, Asia/Taipei local date
  maxT: number | null
  minT: number | null
  pop: number | null  // 12hr rain probability, %
  wxText: string
  icon: string         // Material Symbols Outlined name
}

export interface MarketWeatherForecast {
  county: string
  days: DailyForecast[]
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: `No errors found` (the new types aren't used anywhere yet, so this just confirms the syntax is valid).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add DailyForecast and MarketWeatherForecast types"
```

---

### Task 2: Pure forecast parsing/merging module (TDD)

This is the only part of the feature with real logic worth unit-testing (date-window filtering, day/night period merging, timezone handling). It has **zero imports** so it can run directly under `node --test` without Next.js's module aliasing or `next/cache` (which plain Node cannot resolve) — same pattern as the existing (empty-import) `src/lib/server/historyAggregation.ts`.

**Files:**
- Create: `src/lib/server/cwaForecast.ts`
- Test: `src/lib/server/cwaForecast.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/cwaForecast.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapWxToIcon, parseCwaResponse, mergeForecastPeriods, taipeiISODate } from './cwaForecast'

test('mapWxToIcon: 雷 takes priority over 雨/多雲', () => {
  assert.equal(mapWxToIcon('午後雷陣雨'), 'thunderstorm')
})

test('mapWxToIcon: 雨 takes priority over 多雲', () => {
  assert.equal(mapWxToIcon('多雲短暫雨'), 'rainy')
})

test('mapWxToIcon: 多雲 maps to partly_cloudy_day', () => {
  assert.equal(mapWxToIcon('晴時多雲'), 'partly_cloudy_day')
})

test('mapWxToIcon: 陰 maps to cloud', () => {
  assert.equal(mapWxToIcon('陰天'), 'cloud')
})

test('mapWxToIcon: falls back to sunny', () => {
  assert.equal(mapWxToIcon('晴天'), 'sunny')
})

test('taipeiISODate: UTC late-night rolls into next Taipei day', () => {
  // 2026-07-12T16:30:00Z + 8h = 2026-07-13T00:30 Taipei
  assert.equal(taipeiISODate(new Date('2026-07-12T16:30:00Z')), '2026-07-13')
})

test('taipeiISODate: UTC morning stays same Taipei day', () => {
  // 2026-07-12T01:00:00Z + 8h = 2026-07-12T09:00 Taipei
  assert.equal(taipeiISODate(new Date('2026-07-12T01:00:00Z')), '2026-07-12')
})

const FIXTURE = {
  records: {
    location: [
      {
        locationName: '臺北市',
        weatherElement: [
          {
            elementName: 'Wx',
            time: [
              { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '多雲', parameterValue: '4' } },
              { startTime: '2026-07-12 18:00:00', endTime: '2026-07-13 06:00:00', parameter: { parameterName: '多雲時陰', parameterValue: '7' } },
              { startTime: '2026-07-13 06:00:00', endTime: '2026-07-13 18:00:00', parameter: { parameterName: '午後雷陣雨', parameterValue: '15' } },
              { startTime: '2026-07-13 18:00:00', endTime: '2026-07-14 06:00:00', parameter: { parameterName: '多雲', parameterValue: '4' } },
            ],
          },
          {
            elementName: 'MaxT',
            time: [
              { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '33' } },
              { startTime: '2026-07-12 18:00:00', endTime: '2026-07-13 06:00:00', parameter: { parameterName: '27' } },
              { startTime: '2026-07-13 06:00:00', endTime: '2026-07-13 18:00:00', parameter: { parameterName: '31' } },
              { startTime: '2026-07-13 18:00:00', endTime: '2026-07-14 06:00:00', parameter: { parameterName: '26' } },
            ],
          },
          {
            elementName: 'MinT',
            time: [
              { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '26' } },
              { startTime: '2026-07-12 18:00:00', endTime: '2026-07-13 06:00:00', parameter: { parameterName: '25' } },
              { startTime: '2026-07-13 06:00:00', endTime: '2026-07-13 18:00:00', parameter: { parameterName: '25' } },
              { startTime: '2026-07-13 18:00:00', endTime: '2026-07-14 06:00:00', parameter: { parameterName: '24' } },
            ],
          },
          {
            elementName: 'PoP12h',
            time: [
              { startTime: '2026-07-12 06:00:00', endTime: '2026-07-12 18:00:00', parameter: { parameterName: '20', parameterUnit: '百分比' } },
              { startTime: '2026-07-12 18:00:00', endTime: '2026-07-13 06:00:00', parameter: { parameterName: '10', parameterUnit: '百分比' } },
              { startTime: '2026-07-13 06:00:00', endTime: '2026-07-13 18:00:00', parameter: { parameterName: '70', parameterUnit: '百分比' } },
              { startTime: '2026-07-13 18:00:00', endTime: '2026-07-14 06:00:00', parameter: { parameterName: '30', parameterUnit: '百分比' } },
            ],
          },
        ],
      },
    ],
  },
}

test('parseCwaResponse: extracts one flat period per Wx time entry', () => {
  const periods = parseCwaResponse(FIXTURE)
  assert.equal(periods.length, 4)
  assert.equal(periods[0].wx, '多雲')
  assert.equal(periods[0].maxT, 33)
  assert.equal(periods[0].minT, 26)
  assert.equal(periods[0].pop, 20)
  assert.equal(periods[2].wx, '午後雷陣雨')
})

test('parseCwaResponse: missing records structure returns empty array', () => {
  assert.deepEqual(parseCwaResponse({}), [])
  assert.deepEqual(parseCwaResponse(null), [])
  assert.deepEqual(parseCwaResponse({ records: { location: [] } }), [])
})

test('mergeForecastPeriods: merges day+night into one record per date, prefers daytime Wx', () => {
  const periods = parseCwaResponse(FIXTURE)
  const days = mergeForecastPeriods(periods, '2026-07-12')

  assert.equal(days.length, 2)

  assert.equal(days[0].date, '2026-07-12')
  assert.equal(days[0].maxT, 33) // max of 33/27
  assert.equal(days[0].minT, 25) // min of 26/25
  assert.equal(days[0].pop, 20)  // max of 20/10
  assert.equal(days[0].wxText, '多雲') // daytime period wins
  assert.equal(days[0].icon, 'partly_cloudy_day')

  assert.equal(days[1].date, '2026-07-13')
  assert.equal(days[1].wxText, '午後雷陣雨')
  assert.equal(days[1].icon, 'thunderstorm')
  assert.equal(days[1].pop, 70)
})

test('mergeForecastPeriods: drops dates before today and beyond the 7-day window', () => {
  const periods = parseCwaResponse(FIXTURE)
  // "today" is one day after the fixture's first date -> first date should be dropped
  const days = mergeForecastPeriods(periods, '2026-07-13')
  assert.equal(days.length, 1)
  assert.equal(days[0].date, '2026-07-13')
})

test('mergeForecastPeriods: a date with only a night period still produces a record', () => {
  const periods = parseCwaResponse(FIXTURE).filter((p) => p.startTime !== '2026-07-12 06:00:00')
  const days = mergeForecastPeriods(periods, '2026-07-12')
  assert.equal(days[0].date, '2026-07-12')
  assert.equal(days[0].wxText, '多雲時陰') // only period available, used as fallback
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/server/cwaForecast.test.ts`
Expected: fails immediately with a module-not-found error for `./cwaForecast` (the file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/server/cwaForecast.ts`:

```ts
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
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function parseCwaResponse(json: unknown): CwaForecastPeriod[] {
  const elements = (json as any)?.records?.location?.[0]?.weatherElement
  if (!Array.isArray(elements)) return []

  const findTimes = (name: string): any[] =>
    elements.find((el: any) => el?.elementName === name)?.time ?? []

  const wxTimes = findTimes('Wx')
  const maxTTimes = findTimes('MaxT')
  const minTTimes = findTimes('MinT')
  const popTimes = findTimes('PoP12h')

  return wxTimes
    .map((wxTime: any, i: number): CwaForecastPeriod => ({
      startTime: String(wxTime?.startTime ?? ''),
      endTime: String(wxTime?.endTime ?? ''),
      wx: String(wxTime?.parameter?.parameterName ?? ''),
      maxT: toNumber(maxTTimes[i]?.parameter?.parameterName),
      minT: toNumber(minTTimes[i]?.parameter?.parameterName),
      pop: toNumber(popTimes[i]?.parameter?.parameterName),
    }))
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/server/cwaForecast.test.ts`
Expected: `pass 12`, `fail 0` (all 12 `test()` calls above are green).

- [ ] **Step 5: Point `npm run test:unit` at this file**

`npm run test:unit` currently references `src/lib/server/historyAggregation.test.ts`, which no longer exists in the repo (pre-existing breakage, unrelated to this feature). Repoint it at the test file this task just created so the script actually runs:

Modify `package.json` — change:
```json
"test:unit": "node --test src/lib/server/historyAggregation.test.ts",
```
to:
```json
"test:unit": "node --test src/lib/server/cwaForecast.test.ts",
```

- [ ] **Step 6: Run via npm to confirm the script works**

Run: `npm run test:unit`
Expected: same pass output as Step 4, via the npm script.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/cwaForecast.ts src/lib/server/cwaForecast.test.ts package.json
git commit -m "feat(weather): add pure CWA forecast parsing/merging module"
```

---

### Task 3: I/O shell — `fetchWeeklyForecast`

**Files:**
- Create: `src/lib/server/cwa.ts`

- [ ] **Step 1: Write the implementation**

Create `src/lib/server/cwa.ts`:

```ts
import { unstable_cache } from 'next/cache'
import type { DailyForecast } from '@/lib/types'
import { parseCwaResponse, mergeForecastPeriods, taipeiISODate } from './cwaForecast'

const CWA_FETCH_TIMEOUT_MS = Number(process.env.CWA_FETCH_TIMEOUT_MS ?? '10000')
const CWA_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-005'

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
      console.log(`[cwa] weekly forecast HTTP ${response.status} for county=${county}`)
      return []
    }
    const json = await response.json()
    const periods = parseCwaResponse(json)
    return mergeForecastPeriods(periods, taipeiISODate(new Date()))
  } catch (error) {
    console.log(`[cwa] weekly forecast failed for county=${county}: ${error instanceof Error ? error.message : String(error)}`)
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: `No errors found`

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/cwa.ts
git commit -m "feat(weather): add fetchWeeklyForecast CWA integration with cache + timeout"
```

---

### Task 4: Route handler

**Files:**
- Create: `src/app/api/insights/weather-forecast/route.ts`

- [ ] **Step 1: Write the implementation**

Create `src/app/api/insights/weather-forecast/route.ts`. Note `resolveCountyFromMarketName` is exported from `src/lib/server/moa.ts` (see `src/lib/server/moa.ts:905-907`), not from the new `cwa.ts` — import each helper from its own module:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchWeeklyForecast } from '@/lib/server/cwa'
import { resolveCountyFromMarketName } from '@/lib/server/moa'
import { DEFAULT_MARKET } from '@/lib/constants'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const market = searchParams.get('market') || DEFAULT_MARKET
  const county = searchParams.get('county') || resolveCountyFromMarketName(market)

  const days = await fetchWeeklyForecast(county)

  return NextResponse.json(
    { county, days },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    },
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: `No errors found`

- [ ] **Step 3: Manual smoke test against the running dev server**

Run: `npm run dev` (in background), then in another shell:
```bash
curl -s "http://localhost:3000/api/insights/weather-forecast?market=台北一"
```
Expected (no `CWA_API_KEY` set yet): `{"county":"臺北市","days":[]}` with HTTP 200 — confirms the soft-fail path works end-to-end through the route without throwing.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/insights/weather-forecast/route.ts
git commit -m "feat(api): add /api/insights/weather-forecast route"
```

---

### Task 5: Client fetch helper

**Files:**
- Modify: `src/lib/api.ts:1-14` (import list), append new function near `fetchMarketWeatherRisk` (currently `src/lib/api.ts:152-158`)

- [ ] **Step 1: Add the type import**

In `src/lib/api.ts`, add `MarketWeatherForecast` to the existing type import block (`src/lib/api.ts:1-14`):

```ts
import type {
  MarketOverview,
  TopMover,
  HistoryApiResponse,
  MarketComparison,
  LivestockPrices,
  SeasonalItem,
  MarketOptionsResponse,
  MarketRestDay,
  MarketWeatherObservation,
  TraceabilitySummaryItem,
  ProductCostInsight,
  MarketWeatherRiskSummary,
  MarketWeatherForecast,
} from './types'
```

- [ ] **Step 2: Add the fetch function**

Append after `fetchMarketWeatherRisk` (end of file, currently `src/lib/api.ts:152-158`):

```ts
export async function fetchMarketWeatherForecast(market: string): Promise<MarketWeatherForecast> {
  const params = new URLSearchParams({ market })
  const res = await safeFetch(`${BASE}/insights/weather-forecast?${params}`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch market weather forecast')
  return json as MarketWeatherForecast
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: `No errors found`

- [ ] **Step 4: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat(api): add fetchMarketWeatherForecast client helper"
```

---

### Task 6: `.env.example` documentation

**Files:**
- Modify: `.env.example` (append at end, after `MOA_FETCH_TIMEOUT_MS`)

- [ ] **Step 1: Add the env var block**

Insert after the `MOA_FETCH_TIMEOUT_MS` block (`.env.example:16-17`):

```
# CWA_API_KEY: 中央氣象署開放資料平台會員授權碼 (opendata.cwa.gov.tw 免費申請)。
# 用於休市日行事曆的 7 日天氣預報 (/api/insights/weather-forecast)。
# 未設定時：行事曆的每日天氣圖示略過，不影響其他功能。
CWA_API_KEY=""
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: document CWA_API_KEY env var"
```

---

### Task 7: Wire the forecast into the calendar UI

**Files:**
- Modify: `src/components/pages/InsightsClient.tsx`

- [ ] **Step 1: Import the new helper and type**

Change line 5-6:

```ts
import { fetchMarketRestDays, fetchMarketWeatherRisk } from '@/lib/api'
import type { MarketRestDay, MarketWeatherRiskSummary } from '@/lib/types'
```

to:

```ts
import { fetchMarketRestDays, fetchMarketWeatherRisk, fetchMarketWeatherForecast } from '@/lib/api'
import type { MarketRestDay, MarketWeatherRiskSummary, MarketWeatherForecast } from '@/lib/types'
```

- [ ] **Step 2: Add forecast state**

After the existing `weatherRisk` state (`src/components/pages/InsightsClient.tsx:11`):

```ts
  const [weatherRisk, setWeatherRisk] = useState<MarketWeatherRiskSummary | null>(null)
  const [forecast, setForecast] = useState<MarketWeatherForecast | null>(null)
```

- [ ] **Step 3: Add the fetch effect**

After the existing `loadWeather` effect (`src/components/pages/InsightsClient.tsx:55-69`), add a parallel effect:

```ts
  useEffect(() => {
    async function loadForecast() {
      if (market === '全部市場') {
        setForecast(null)
        return
      }
      try {
        const data = await fetchMarketWeatherForecast(market)
        setForecast(data)
      } catch {
        setForecast(null)
      }
    }
    loadForecast()
  }, [market])
```

- [ ] **Step 4: Build the date lookup**

After `restDaysByDate` (`src/components/pages/InsightsClient.tsx:88-92`):

```ts
  const restDaysByDate = restDays.reduce((acc, rd) => {
    if (!acc[rd.date]) acc[rd.date] = []
    acc[rd.date].push(rd)
    return acc
  }, {} as Record<string, MarketRestDay[]>)

  const forecastByDate = (forecast?.days ?? []).reduce((acc, day) => {
    acc[day.date] = day
    return acc
  }, {} as Record<string, MarketWeatherForecast['days'][number]>)
```

- [ ] **Step 5: Render the icon in each grid cell**

In the `gridDates.map` callback (`src/components/pages/InsightsClient.tsx:200-227`), add `dayForecast` lookup and render it. Change:

```tsx
              {gridDates.map((date) => {
                const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                const isCurrentMonth = date.getMonth() === month
                const isToday = dateString === todayString
                const dayRestDays = restDaysByDate[dateString] || []
                const isRest = dayRestDays.length > 0

                return (
                  <div 
                    key={dateString} 
                    className={`bg-surface min-h-[100px] p-2 flex flex-col gap-1 transition-colors relative group
                      ${!isCurrentMonth ? 'opacity-40 bg-surface/50' : ''}
                      ${isRest ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-surface-container-low'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-label-md font-medium w-7 h-7 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-primary text-on-primary' : 'text-on-surface'}
                        ${isRest && !isToday ? 'text-error' : ''}
                      `}>
                        {date.getDate()}
                      </span>
                      {isRest && (
                        <span className="material-symbols-outlined text-error text-[20px] opacity-80" aria-hidden="true">
                          cancel
                        </span>
                      )}
                    </div>
```

to:

```tsx
              {gridDates.map((date) => {
                const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                const isCurrentMonth = date.getMonth() === month
                const isToday = dateString === todayString
                const dayRestDays = restDaysByDate[dateString] || []
                const isRest = dayRestDays.length > 0
                const dayForecast = forecastByDate[dateString]

                return (
                  <div 
                    key={dateString} 
                    className={`bg-surface min-h-[100px] p-2 flex flex-col gap-1 transition-colors relative group
                      ${!isCurrentMonth ? 'opacity-40 bg-surface/50' : ''}
                      ${isRest ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-surface-container-low'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-label-md font-medium w-7 h-7 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-primary text-on-primary' : 'text-on-surface'}
                        ${isRest && !isToday ? 'text-error' : ''}
                      `}>
                        {date.getDate()}
                      </span>
                      <div className="flex items-center gap-1">
                        {dayForecast && (
                          <span
                            className="material-symbols-outlined text-on-surface-variant text-[16px]"
                            title={`${dayForecast.wxText}${dayForecast.pop !== null ? ` · 降雨機率 ${dayForecast.pop}%` : ''}`}
                          >
                            {dayForecast.icon}
                          </span>
                        )}
                        {isRest && (
                          <span className="material-symbols-outlined text-error text-[20px] opacity-80" aria-hidden="true">
                            cancel
                          </span>
                        )}
                      </div>
                    </div>
                    {dayForecast && (
                      <div className="text-[10px] leading-tight text-on-surface-variant">
                        {dayForecast.maxT !== null ? `${Math.round(dayForecast.maxT)}°` : '--'}
                        {' / '}
                        {dayForecast.minT !== null ? `${Math.round(dayForecast.minT)}°` : '--'}
                      </div>
                    )}
```

The rest of the cell (the `<div className="flex-1 mt-1">...` block and the tooltip) stays unchanged — just insert the `dayForecast` temperature line between the header row and that existing block.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: `No errors found`

- [ ] **Step 7: Manual verification in the browser**

Run: `npm run dev` (if not already running from Task 4)
Open: `http://localhost:3000/insights`
Expected without `CWA_API_KEY` set: calendar renders exactly as before (no icons, no errors in browser console) — confirms the soft-fail path doesn't break the existing page.
Switch the market dropdown away from and back to a non-"全部市場" value: confirm no crash and no stale icons carry over (`forecastByDate` should be empty since there's no key yet).

- [ ] **Step 8: Commit**

```bash
git add src/components/pages/InsightsClient.tsx
git commit -m "feat(insights): render 7-day weather forecast icons in rest-day calendar"
```

---

### Task 8: Final full-repo verification

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit -p .`
Expected: `No errors found`

- [ ] **Step 2: Unit tests**

Run: `npm run test:unit`
Expected: all `cwaForecast.test.ts` cases pass.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors introduced by the changed files.

- [ ] **Step 4: Manual end-to-end check**

With the dev server running, visit `/insights`, cycle through a few markets (e.g. 台北一, 高雄市, 全部市場) and a couple of months. Confirm:
- No icons/errors when `CWA_API_KEY` is unset.
- The existing 休市日 red "cancel" badges and month-header risk icon still work exactly as before this change.

Once you have a real `CWA_API_KEY` in `.env`, repeat this check and additionally confirm the 7 days from today show a weather icon + temp range that roughly matches the public CWA forecast for that county.
