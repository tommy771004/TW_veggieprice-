/**
 * Market Overview module (C1 / W2).
 *
 * Small interface over category-specific feeds:
 *   getMarketTrend · getMarketOverview · overviewFromSeries · getTopMovers
 *
 * Route handlers stay thin HTTP adapters; day-rollup math lives here.
 */
import type { MarketOverview, PriceHistoryPoint } from "@/lib/types";
import { todayISO } from "@/lib/server/dateUtils";
import {
  fetchLivestockPorkTrend,
  fetchMarketOverviewTrend,
  fetchSeafoodMarketTrend,
  type MarketOverviewTrendPoint,
} from "@/lib/server/moa";
import {
  overviewFromSeries,
  type TradingDayPoint,
} from "@/lib/server/marketOverviewCore";

export {
  overviewFromSeries,
  type TradingDayPoint,
} from "@/lib/server/marketOverviewCore";

/** Homepage / API category query values (not MOA N04/N05 codes). */
export type MarketOverviewCategory =
  | "vegetable"
  | "fruit"
  | "meat"
  | "seafood"
  | string;

export type MarketTrendResult = {
  points: TradingDayPoint[];
  error?: string;
};

export type MarketOverviewResult = {
  overview: MarketOverview | null;
  error?: string;
};

function categoryToMoaMarketType(
  category: MarketOverviewCategory,
): string | undefined {
  if (category === "fruit") return "Fruit";
  if (category === "vegetable") return "Veg";
  return undefined;
}

function toHistoryPoints(
  points: MarketOverviewTrendPoint[] | TradingDayPoint[],
): PriceHistoryPoint[] {
  return points.map((p) => ({
    date: p.date,
    label: p.label ?? p.date,
    avgPrice: p.avgPrice,
    volume: p.volume ?? null,
    isClosed: "isClosed" in p ? p.isClosed : undefined,
  }));
}

/**
 * Category-aware market average series (veg/fruit N04·N05, seafood snapshot, pork heads).
 */
export async function getMarketTrend(args: {
  market: string;
  category: MarketOverviewCategory;
  days?: number;
  endDate?: string;
}): Promise<MarketTrendResult> {
  const days = args.days ?? 7;
  const category = args.category || "vegetable";

  try {
    if (category === "meat") {
      const res = await fetchLivestockPorkTrend(days);
      if (res.error || res.points.length === 0) {
        return { points: [], error: res.error || "查無市場趨勢資料" };
      }
      return { points: res.points };
    }

    if (category === "seafood") {
      const res = await fetchSeafoodMarketTrend(args.market, days);
      if (res.error || res.points.length === 0) {
        return { points: [], error: res.error || "查無市場趨勢資料" };
      }
      return { points: res.points };
    }

    const marketType = categoryToMoaMarketType(category);
    const endDate = args.endDate ?? todayISO();
    const res = await fetchMarketOverviewTrend(
      args.market,
      days,
      endDate,
      marketType,
    );
    if (res.error || res.points.length === 0) {
      return {
        points: [],
        error: res.error || "查無市場趨勢資料",
      };
    }
    return { points: res.points };
  } catch (err) {
    return {
      points: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Category-aware single-day market overview (latest trading day vs previous).
 * Meat uses national pork average; marketName is fixed to 全國平均.
 */
export async function getMarketOverview(args: {
  market: string;
  category: MarketOverviewCategory;
  /** End date for veg/fruit window (ISO). */
  asOf?: string;
  /** Lookback days used to build the series (default 7). */
  days?: number;
}): Promise<MarketOverviewResult> {
  const category = args.category || "vegetable";
  const marketName = category === "meat" ? "全國平均" : args.market;

  const trend = await getMarketTrend({
    market: args.market,
    category,
    days: args.days ?? 7,
    endDate: args.asOf,
  });

  if (trend.error || trend.points.length === 0) {
    return {
      overview: null,
      error: trend.error || "查無市場概況資料",
    };
  }

  const overview = overviewFromSeries(trend.points, marketName);
  if (!overview) {
    return { overview: null, error: "查無市場概況資料" };
  }
  return { overview };
}

/** Map trend points into PriceHistoryPoint for RSC / chart consumers. */
export function trendAsHistoryPoints(
  points: TradingDayPoint[],
): PriceHistoryPoint[] {
  return toHistoryPoints(points);
}

export { getTopMovers } from "@/lib/server/marketTopMovers";
export type { TopMoversResult } from "@/lib/server/marketTopMovers";
