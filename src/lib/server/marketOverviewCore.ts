/**
 * Pure Market Overview projections — no I/O, safe for node:test without path aliases.
 */
import type { MarketOverview, PriceHistoryPoint } from "../types.ts";
import type { MarketOverviewTrendPoint } from "./marketOverviewTypes.ts";
import {
  NATIONAL_OVERVIEW_LABEL,
  isAggregateMarket,
} from "../constants.ts";

export type TradingDayPoint = {
  date: string;
  label?: string;
  avgPrice: number | null;
  volume?: number | null;
  isClosed?: boolean;
};

export type MarketOverviewTrendValue = Pick<
  MarketOverviewTrendPoint,
  "avgPrice" | "volume"
>;

/**
 * Fill a date range from trading-day values, preserving an explicit closed-day
 * marker for dates that have no source value.
 */
export function buildMarketOverviewTrendPoints(
  dates: string[],
  valuesByDate: ReadonlyMap<string, MarketOverviewTrendValue>,
  labelForDate: (date: string) => string,
): MarketOverviewTrendPoint[] {
  return dates.map((date) => {
    const value = valuesByDate.get(date);
    return {
      date,
      label: labelForDate(date),
      avgPrice: value?.avgPrice ?? null,
      volume: value?.volume ?? null,
      isClosed: value === undefined,
    };
  });
}

export function toHistoryPoints(
  points: TradingDayPoint[],
): PriceHistoryPoint[] {
  return points.map((point) => ({
    date: point.date,
    label: point.label ?? point.date,
    avgPrice: point.avgPrice,
    volume: point.volume ?? null,
    isClosed: point.isClosed,
  }));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Resolve the display label for a Market Overview scope.
 * Aggregate and meat feeds represent the National Overview, while named
 * produce scopes retain their physical market label.
 */
export function getMarketOverviewScopeLabel(
  category: string,
  market: string,
): string {
  return category === "meat" || isAggregateMarket(market)
    ? NATIONAL_OVERVIEW_LABEL
    : market;
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
