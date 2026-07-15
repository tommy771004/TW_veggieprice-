/**
 * Pure Market Overview projections — no I/O, safe for node:test without path aliases.
 */
import type { MarketOverview } from "../types.ts";

export type TradingDayPoint = {
  date: string;
  label?: string;
  avgPrice: number | null;
  volume?: number | null;
  isClosed?: boolean;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Project a date-ordered series (null = closed / missing) into Market Overview
 * using the latest and previous non-null trading days.
 */
export function overviewFromSeries(
  points: TradingDayPoint[],
  marketName: string,
  updatedAt: string = new Date().toISOString(),
): MarketOverview | null {
  const trading = points
    .slice()
    .reverse()
    .filter((p) => p.avgPrice !== null && p.avgPrice !== undefined);

  if (trading.length === 0) return null;

  const latest = trading[0];
  const previous = trading[1];
  const avgPrice = latest.avgPrice ?? 0;
  const totalVolume = latest.volume ?? 0;
  const previousAvgPrice = previous?.avgPrice ?? 0;
  const previousTotalVolume = previous?.volume ?? 0;

  const priceChange =
    previousAvgPrice > 0
      ? ((avgPrice - previousAvgPrice) / previousAvgPrice) * 100
      : 0;
  const volumeChange =
    previousTotalVolume > 0
      ? ((totalVolume - previousTotalVolume) / previousTotalVolume) * 100
      : 0;

  return {
    date: latest.date,
    avgPrice: round1(avgPrice),
    totalVolume: Math.round(totalVolume),
    priceChange: round1(priceChange),
    volumeChange: round1(volumeChange),
    marketName,
    updatedAt,
  };
}
