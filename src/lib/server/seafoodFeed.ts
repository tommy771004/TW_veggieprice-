/**
 * Seafood snapshot feed — deep module for latest-seafood.json + market day rollups.
 */
import { unstable_cache } from "next/cache";
import fs from "fs";
import path from "path";
import {
  dateLabel,
  dateRange,
  normalizeMoaDate,
  subtractDays,
  todayISO,
} from "@/lib/server/dateUtils";
import { marketsMatch } from "@/lib/markets";
import {
  buildMarketOverviewTrendPoints,
  type MarketOverviewTrendValue,
} from "@/lib/server/marketOverviewCore";
import type { MarketOverviewTrendResult } from "@/lib/server/marketOverviewTypes";

export type {
  MarketOverviewTrendPoint,
  MarketOverviewTrendResult,
} from "@/lib/server/marketOverviewTypes";

/** Shape of one record in public/data/latest-seafood.json written by fetch-moa-data.js */
export interface SeafoodRawRecord {
  交易日期?: string | number;
  品種代碼?: string | number;
  魚貨名稱?: string;
  市場名稱?: string;
  上價?: number | string;
  中價?: number | string;
  下價?: number | string;
  平均價?: number | string;
  交易量?: number | string;
}

async function fetchLatestSeafoodDataUncached(): Promise<SeafoodRawRecord[]> {
  const localFile = path.join(
    process.cwd(),
    "public",
    "data",
    "latest-seafood.json",
  );
  const fileContent = await fs.promises.readFile(localFile, "utf-8");
  const parsed = JSON.parse(fileContent) as {
    data?: SeafoodRawRecord[];
  };

  return Array.isArray(parsed.data) ? parsed.data : [];
}

const fetchLatestSeafoodDataCached = unstable_cache(
  fetchLatestSeafoodDataUncached,
  ["moa-latest-seafood-data-v1"],
  { revalidate: 3600, tags: ["moa-latest-seafood-data"] },
);

export async function fetchLatestSeafoodData(): Promise<SeafoodRawRecord[]> {
  return fetchLatestSeafoodDataCached();
}

export interface SeafoodMarketDaySummary {
  date: string;
  avgPrice: number;
  totalVolume: number;
}

/** Aggregate seafood snapshot rows for one market, keyed by ISO trading date. */
export async function fetchSeafoodMarketDailySummaries(
  market: string,
): Promise<SeafoodMarketDaySummary[]> {
  const records = await fetchLatestSeafoodData();
  const byDate = new Map<string, { priceSum: number; volSum: number; n: number }>();

  for (const r of records) {
    const name = String(r["市場名稱"] ?? "");
    if (
      market !== "全部市場" &&
      name !== market &&
      !marketsMatch(name, market)
    ) {
      continue;
    }
    const date = normalizeMoaDate(String(r["交易日期"] ?? ""));
    if (!date) continue;
    const avgPrice = Number(r["平均價"]) || 0;
    const vol = Number(r["交易量"]) || 0;
    if (avgPrice <= 0) continue;
    const cur = byDate.get(date) ?? { priceSum: 0, volSum: 0, n: 0 };
    cur.priceSum += avgPrice;
    cur.volSum += vol;
    cur.n += 1;
    byDate.set(date, cur);
  }

  return [...byDate.entries()]
    .map(([date, cur]) => ({
      date,
      avgPrice: Math.round((cur.priceSum / cur.n) * 10) / 10,
      totalVolume: Math.round(cur.volSum * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchSeafoodMarketOverview(market: string): Promise<{
  date: string;
  avgPrice: number;
  totalVolume: number;
  priceChange: number;
  volumeChange: number;
  marketName: string;
  error?: string;
}> {
  const days = await fetchSeafoodMarketDailySummaries(market);
  if (days.length === 0) {
    return {
      date: todayISO(),
      avgPrice: 0,
      totalVolume: 0,
      priceChange: 0,
      volumeChange: 0,
      marketName: market,
      error: "查無市場概況資料",
    };
  }

  const latest = days[days.length - 1];
  const previous = days.length > 1 ? days[days.length - 2] : null;
  const priceChange =
    previous && previous.avgPrice > 0
      ? ((latest.avgPrice - previous.avgPrice) / previous.avgPrice) * 100
      : 0;
  const volumeChange =
    previous && previous.totalVolume > 0
      ? ((latest.totalVolume - previous.totalVolume) / previous.totalVolume) *
        100
      : 0;

  return {
    date: latest.date,
    avgPrice: latest.avgPrice,
    totalVolume: latest.totalVolume,
    priceChange: Math.round(priceChange * 10) / 10,
    volumeChange: Math.round(volumeChange * 10) / 10,
    marketName: market,
  };
}

export async function fetchSeafoodMarketTrend(
  market: string,
  days: number,
): Promise<MarketOverviewTrendResult> {
  const normalizedDays = Math.min(Math.max(Math.floor(days), 1), 30);
  const summaries = await fetchSeafoodMarketDailySummaries(market);
  if (summaries.length === 0) {
    return { points: [], error: "查無市場趨勢資料" };
  }

  const byDate = new Map(summaries.map((s) => [s.date, s]));
  const endDate = summaries[summaries.length - 1].date;
  const startDate = subtractDays(endDate, Math.max(normalizedDays - 1, 0));

  const valuesByDate = new Map<string, MarketOverviewTrendValue>(
    [...byDate.entries()].map(([date, hit]) => [
      date,
      { avgPrice: hit.avgPrice, volume: hit.totalVolume },
    ]),
  );
  const points = buildMarketOverviewTrendPoints(
    dateRange(startDate, endDate),
    valuesByDate,
    dateLabel,
  );

  if (!points.some((p) => p.avgPrice !== null)) {
    return { points: [], error: "查無市場趨勢資料" };
  }
  return { points };
}
