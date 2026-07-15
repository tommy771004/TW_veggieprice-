/**
 * Category-aware top price movers.
 *
 * Product rules:
 * - National unit price per crop per day (volume-weighted when qty exists).
 * - Change = latest *reliable* day vs previous *reliable* day
 *   (soft min national volume so thin quotes are not a false baseline).
 * - Veg/fruit/seafood unit prices converted to 元/台斤 for display (from 元/公斤).
 * - Exclude miscellaneous "其他…" / "*-其他" crop names.
 */
import type { TopMover } from "@/lib/types";
import { getCropEmoji } from "@/lib/utils";
import {
  CROP_TYPE_FRUIT,
  CROP_TYPE_VEG,
  fetchLatestSeafoodData,
  fetchLivestockPrices,
  fetchRecentOpenData,
  type SeafoodRawRecord,
} from "@/lib/server/moa";
import { normalizeMoaDate } from "@/lib/server/dateUtils";
import {
  buildCropNationalPriceSeries,
  cropChangesFromNationalSeries,
  type PricedTradeRow,
} from "@/lib/server/nationalDayPrice";
import { kgPriceToTaijin } from "@/lib/server/priceUnits";

const DEFAULT_LIMIT = 5;

/** Soft floors: day must clear this national volume to enter comparison. */
const MIN_DAY_VOLUME_KG = {
  vegetable: 200,
  fruit: 200,
  seafood: 30,
} as const;

/** Drop residual noise spikes from ranking (still computed from real days). */
const MAX_ABS_CHANGE_PCT = 80;

export type TopMoversResult = {
  movers: TopMover[];
  error?: string;
};

function rankByAbsChange(
  items: TopMover[],
  limit: number,
): TopMover[] {
  return items
    .filter(
      (m) =>
        m.currentPrice > 0 && Math.abs(m.priceChange) <= MAX_ABS_CHANGE_PCT,
    )
    .sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange))
    .slice(0, limit);
}

function moversFromPricedRows(
  rows: PricedTradeRow[],
  limit: number,
  /** Convert kg → 台斤 for display */
  toTaijin: boolean,
  minDayVolume: number,
): TopMoversResult {
  const series = buildCropNationalPriceSeries(rows);
  const changes = cropChangesFromNationalSeries(series, {
    minDayVolume,
    minMarkets: 1,
  });
  const movers: TopMover[] = changes.map((c) => {
    const displayPrice = toTaijin
      ? kgPriceToTaijin(c.latestPrice)
      : Math.round(c.latestPrice * 10) / 10;
    return {
      cropCode: c.cropCode || "—",
      cropName: c.cropName,
      marketName: "全國平均",
      grade: "不分",
      currentPrice: displayPrice,
      priceChange: c.priceChange,
      emoji: getCropEmoji(c.cropName),
    };
  });

  const ranked = rankByAbsChange(movers, limit);
  if (ranked.length === 0) {
    return { movers: [], error: "查無波動排行資料" };
  }
  return { movers: ranked };
}

async function meatMovers(limit: number): Promise<TopMoversResult> {
  const livestock = await fetchLivestockPrices();
  // Livestock quotes are 元/公斤 for pork etc.; eggs often 台斤 — convert kg items.
  const movers = [
    {
      name: "毛豬",
      price: livestock.porkAvgPrice,
      change: livestock.porkPriceChange,
      kg: true,
    },
    {
      name: "白肉雞",
      price: livestock.chickenPrice,
      change: livestock.chickenPriceChange,
      kg: false, // 元/台斤 in feed
    },
    {
      name: "紅羽土雞",
      price: livestock.redFeatherChickenPrice,
      change: livestock.redFeatherChickenPriceChange,
      kg: false,
    },
    {
      name: "肉鵝",
      price: livestock.goosePrice,
      change: livestock.goosePriceChange,
      kg: false,
    },
    {
      name: "肉鴨",
      price: livestock.duckPrice,
      change: livestock.duckPriceChange,
      kg: false,
    },
    {
      name: "羊",
      price: livestock.sheepAvgPrice,
      change: livestock.sheepAvgPriceChange,
      kg: true,
    },
    {
      name: "雞蛋",
      price: livestock.eggPrice,
      change: livestock.eggPriceChange,
      kg: false,
    },
  ]
    .map((item) => {
      const raw = item.price || 0;
      const currentPrice = item.kg ? kgPriceToTaijin(raw) : Math.round(raw * 10) / 10;
      return {
        cropCode: "M01",
        cropName: item.name,
        marketName: "全國平均",
        grade: "中平",
        currentPrice,
        priceChange: item.change || 0,
        emoji: getCropEmoji(item.name),
      };
    })
    .filter((m) => m.currentPrice > 0);

  const ranked = rankByAbsChange(movers, limit);
  if (ranked.length === 0) {
    return { movers: [], error: "查無波動排行資料" };
  }
  return { movers: ranked };
}

async function seafoodMovers(limit: number): Promise<TopMoversResult> {
  const records = await fetchLatestSeafoodData();

  // Drop stub quotes (same upper=mid=lower=avg across many species).
  const priceClusters = new Map<string, Set<string>>();
  for (const record of records as SeafoodRawRecord[]) {
    const upper = Number(record["上價"]);
    const middle = Number(record["中價"]);
    const lower = Number(record["下價"]);
    const avg = Number(record["平均價"]);
    if (upper === middle && middle === lower && upper === avg && avg > 0) {
      const key = `${record["市場名稱"]}|${record["交易日期"]}|${avg}`;
      const names = priceClusters.get(key) ?? new Set<string>();
      names.add(String(record["魚貨名稱"] ?? ""));
      priceClusters.set(key, names);
    }
  }

  const rows: PricedTradeRow[] = [];
  for (const record of records as SeafoodRawRecord[]) {
    const name = String(record["魚貨名稱"] ?? "");
    if (!name || name.startsWith("其他")) continue;

    const avgPrice = Number(record["平均價"]) || 0;
    const volume = Number(record["交易量"]) || 0;
    const upper = Number(record["上價"]);
    const middle = Number(record["中價"]);
    const lower = Number(record["下價"]);
    if (upper === middle && middle === lower && upper === avgPrice && avgPrice > 0) {
      const key = `${record["市場名稱"]}|${record["交易日期"]}|${avgPrice}`;
      if ((priceClusters.get(key)?.size ?? 0) >= 3) continue;
    }

    const date = normalizeMoaDate(String(record["交易日期"] ?? ""));
    if (!date || !(avgPrice > 0)) continue;

    rows.push({
      cropName: name,
      cropCode: String(record["品種代碼"] ?? ""),
      date,
      avgPrice,
      volume,
    });
  }

  return moversFromPricedRows(rows, limit, true, MIN_DAY_VOLUME_KG.seafood);
}

async function openDataMovers(
  category: string,
  limit: number,
): Promise<TopMoversResult> {
  const cropType = category === "fruit" ? CROP_TYPE_FRUIT : CROP_TYPE_VEG;
  const minDayVolume =
    category === "fruit"
      ? MIN_DAY_VOLUME_KG.fruit
      : MIN_DAY_VOLUME_KG.vegetable;
  const recentRecords = await fetchRecentOpenData();
  const rows: PricedTradeRow[] = recentRecords
    .filter(
      (r) =>
        r.marketName !== "全國平均" &&
        r._typeCode === cropType &&
        r.avgPrice > 0 &&
        !!r.date &&
        !!r.cropName,
    )
    .map((r) => ({
      cropName: r.cropName,
      cropCode: r.cropCode,
      date: r.date,
      avgPrice: r.avgPrice,
      volume: r.transWeight,
    }));

  return moversFromPricedRows(rows, limit, true, minDayVolume);
}

export async function getTopMovers(args: {
  category?: string;
  limit?: number;
}): Promise<TopMoversResult> {
  const category = args.category || "vegetable";
  const limit = args.limit ?? DEFAULT_LIMIT;

  try {
    if (category === "meat") return meatMovers(limit);
    if (category === "seafood") return seafoodMovers(limit);
    return openDataMovers(category, limit);
  } catch {
    return { movers: [], error: "查無波動排行資料" };
  }
}
