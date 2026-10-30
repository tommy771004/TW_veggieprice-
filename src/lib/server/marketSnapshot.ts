import fs from 'fs'
import path from 'path'
import { buildMarketSnapshot, type DailyRow, type MarketSnapshot } from '@/lib/marketSnapshot'
import { subtractDays, todayISO } from '@/lib/server/dateUtils'
import { readLocalDataJson } from '@/lib/server/localData'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')

// Enough to span a long holiday break plus the previous trading day.
const LOOKBACK_DAYS = 14

async function readDaily(iso: string): Promise<DailyRow[]> {
  try {
    const parsed = await readLocalDataJson<unknown>(`daily/${iso}.json`)
    return Array.isArray(parsed) ? (parsed as DailyRow[]) : []
  } catch {
    return [] // 休市 / not yet synced
  }
}

/** Latest trading day for one market from the synced daily files. */
export async function loadMarketSnapshot(market: string): Promise<MarketSnapshot | null> {
  const today = todayISO()
  const dates = Array.from({ length: LOOKBACK_DAYS }, (_, i) => subtractDays(today, i))
  const days = await Promise.all(dates.map(async (iso) => [iso, await readDaily(iso)] as [string, DailyRow[]]))
  return buildMarketSnapshot(market, days)
}

/** Every market's snapshot in one pass over the files (for the /market index). */
export async function loadAllMarketSnapshots(markets: string[]): Promise<Map<string, MarketSnapshot | null>> {
  const today = todayISO()
  const dates = Array.from({ length: LOOKBACK_DAYS }, (_, i) => subtractDays(today, i))
  const days = await Promise.all(dates.map(async (iso) => [iso, await readDaily(iso)] as [string, DailyRow[]]))
  return new Map(markets.map((m) => [m, buildMarketSnapshot(m, days)]))
}

interface RestDay {
  marketName: string
  date: string
  note?: string
}

/** Next few announced rest days (休市日) for a market, today inclusive. */
export async function loadUpcomingRestDays(market: string, count = 3): Promise<string[]> {
  try {
    const parsed = JSON.parse(await fs.promises.readFile(path.join(DATA_DIR, 'market-rest-days.json'), 'utf-8'))
    if (!Array.isArray(parsed)) return []
    const today = todayISO()
    return [...new Set(
      (parsed as RestDay[])
        // Exact name: the file also lists fish markets under short names (台北, 台中).
        .filter((d) => d.date >= today && d.marketName === market)
        .map((d) => d.date),
    )]
      .sort()
      .slice(0, count)
  } catch {
    return []
  }
}
