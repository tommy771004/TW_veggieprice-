/**
 * Category-aware top price movers (C1 phase 2).
 * HTTP route stays a thin adapter over getTopMovers.
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
const OPEN_DATA_MIN_VOLUME_KG = 2000;
const MAX_BASELINE_TRADING_DAYS = 7;
const DEFAULT_LIMIT = 5;

export type TopMoversResult = {
  movers: TopMover[];
  error?: string;
};

type RankedMover = TopMover & { transWeight?: number };

function rankMovers(
  items: RankedMover[],
  limit: number,
): RankedMover[] {
  return items
    .filter((m) => m.currentPrice >= 3)
    .sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange))
    .slice(0, limit);
}

async function meatMovers(limit: number): Promise<TopMoversResult> {
  const livestock = await fetchLivestockPrices();
  const movers = [
    {
      name: "毛豬",
      price: livestock.porkAvgPrice,
      change: livestock.porkPriceChange,
    },
    {
      name: "白肉雞",
      price: livestock.chickenPrice,
      change: livestock.chickenPriceChange,
    },
    {
      name: "紅羽土雞",
      price: livestock.redFeatherChickenPrice,
      change: livestock.redFeatherChickenPriceChange,
    },
    {
      name: "肉鵝",
      price: livestock.goosePrice,
      change: livestock.goosePriceChange,
    },
    {
      name: "肉鴨",
      price: livestock.duckPrice,
      change: livestock.duckPriceChange,
    },
    {
      name: "羊",
      price: livestock.sheepAvgPrice,
      change: livestock.sheepAvgPriceChange,
    },
    {
      name: "雞蛋",
      price: livestock.eggPrice,
      change: livestock.eggPriceChange,
    },
  ]
    .map((item) => ({
      cropCode: "M01",
      cropName: item.name,
      marketName: "全國平均",
      grade: "中平",
      currentPrice: item.price || 0,
      priceChange: item.change || 0,
      emoji: getCropEmoji(item.name),
      transWeight: 1000,
    }))
    .filter((m) => m.currentPrice > 0)
    .sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange))
    .slice(0, limit);

  if (movers.length === 0) {
    return { movers: [], error: "查無波動排行資料" };
  }
  return { movers };
}

async function seafoodMovers(limit: number): Promise<TopMoversResult> {
  const records = await fetchLatestSeafoodData();

  const tradingDates = [
    ...new Set(
      records
        .map((r: SeafoodRawRecord) => String(r["交易日期"] ?? ""))
        .filter(Boolean),
    ),
  ]
    .sort()
    .reverse() as string[];
  const latestDate = tradingDates[0];
  if (!latestDate) {
    return { movers: [], error: "查無波動排行資料" };
  }

  const cropDateSums: Record<
    string,
    Record<string, { sumPriceVol: number; sumVol: number; cropCode: string }>
  > = {};

  // Stub quotes: same upper=mid=lower=avg across many species on same market+day.
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

  for (const record of records as SeafoodRawRecord[]) {
    const name = String(record["魚貨名稱"] ?? "");
    if (name.startsWith("其他")) continue;

    const avgPrice = Number(record["平均價"]) || 0;
    const transWeight = Number(record["交易量"]) || 0;

    const upper = Number(record["上價"]);
    const middle = Number(record["中價"]);
    const lower = Number(record["下價"]);
    if (upper === middle && middle === lower && upper === avgPrice) {
      const key = `${record["市場名稱"]}|${record["交易日期"]}|${avgPrice}`;
      if ((priceClusters.get(key)?.size ?? 0) >= 3) continue;
    }

    if (avgPrice > 0 && transWeight > 0) {
      const d = String(record["交易日期"] ?? "");
      if (!cropDateSums[name]) cropDateSums[name] = {};
      if (!cropDateSums[name][d]) {
        cropDateSums[name][d] = {
          sumPriceVol: 0,
          sumVol: 0,
          cropCode: String(record["品種代碼"] ?? ""),
        };
      }
      cropDateSums[name][d].sumPriceVol += avgPrice * transWeight;
      cropDateSums[name][d].sumVol += transWeight;
    }
  }

  const ranked = rankMovers(
    Object.keys(cropDateSums)
      .map((cropName) => {
        const todayData = cropDateSums[cropName]?.[latestDate];
        if (!todayData || todayData.sumVol < 50) return null;

        const currentPrice = todayData.sumPriceVol / todayData.sumVol;
        let baselinePrice = 0;
        for (let i = 1; i < tradingDates.length && i <= 7; i++) {
          const prevDate = tradingDates[i] as string;
          const prevData = cropDateSums[cropName]?.[prevDate];
          if (prevData && prevData.sumVol >= 50) {
            baselinePrice = prevData.sumPriceVol / prevData.sumVol;
            break;
          }
        }
        if (baselinePrice <= 0) return null;

        const change = ((currentPrice - baselinePrice) / baselinePrice) * 100;
        return {
          cropCode: todayData.cropCode,
          cropName,
          marketName: "全國平均",
          grade: "不分",
          currentPrice: Math.round(currentPrice * 10) / 10,
          priceChange: Math.round(change * 10) / 10,
          emoji: getCropEmoji(cropName),
          transWeight: Math.round(todayData.sumVol),
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null),
    limit,
  );

  if (ranked.length === 0) {
    return { movers: [], error: "查無波動排行資料" };
  }
  return { movers: ranked };
}

async function openDataMovers(
  category: string,
  limit: number,
): Promise<TopMoversResult> {
  const cropType = category === "fruit" ? CROP_TYPE_FRUIT : CROP_TYPE_VEG;
  const recentRecords = await fetchRecentOpenData();
  const allRecords = recentRecords.filter(
    (r) => r.marketName !== "全國平均" && r._typeCode === cropType,
  );

  if (allRecords.length === 0) {
    return { movers: [], error: "查無波動排行資料" };
  }

  const tradingDates = [
    ...new Set(allRecords.map((r) => r.date).filter(Boolean)),
  ]
    .sort()
    .reverse();
  const latestDate = tradingDates[0] ?? "";
  if (!latestDate) {
    return { movers: [], error: "查無波動排行資料" };
  }

  const cropDateSums: Record<
    string,
    Record<string, { sumPriceVol: number; sumVol: number; cropCode: string }>
  > = {};

  for (const record of allRecords) {
    if (record.avgPrice > 0 && record.transWeight > 0) {
      const name = record.cropName;
      const d = record.date;
      if (!cropDateSums[name]) cropDateSums[name] = {};
      if (!cropDateSums[name][d]) {
        cropDateSums[name][d] = {
          sumPriceVol: 0,
          sumVol: 0,
          cropCode: record.cropCode,
        };
      }
      cropDateSums[name][d].sumPriceVol += record.avgPrice * record.transWeight;
      cropDateSums[name][d].sumVol += record.transWeight;
    }
  }

  const ranked = rankMovers(
    Object.keys(cropDateSums)
      .map((cropName) => {
        const todayData = cropDateSums[cropName][latestDate];
        if (!todayData || todayData.sumVol < OPEN_DATA_MIN_VOLUME_KG) {
          return null;
        }
        const currentPrice = todayData.sumPriceVol / todayData.sumVol;
        let baselinePrice = 0;
        for (
          let i = 1;
          i < tradingDates.length && i <= MAX_BASELINE_TRADING_DAYS;
          i++
        ) {
          const prevDate = tradingDates[i];
          const prevData = cropDateSums[cropName][prevDate];
          if (prevData && prevData.sumVol >= OPEN_DATA_MIN_VOLUME_KG) {
            baselinePrice = prevData.sumPriceVol / prevData.sumVol;
            break;
          }
        }
        if (baselinePrice <= 0) return null;
        const change = ((currentPrice - baselinePrice) / baselinePrice) * 100;
        return {
          cropCode: todayData.cropCode,
          cropName,
          marketName: "全國平均",
          grade: "不分",
          currentPrice: Math.round(currentPrice * 10) / 10,
          priceChange: Math.round(change * 10) / 10,
          emoji: getCropEmoji(cropName),
          transWeight: Math.round(todayData.sumVol),
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null),
    limit,
  );

  if (ranked.length === 0) {
    return { movers: [], error: "查無波動排行資料" };
  }
  return { movers: ranked };
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
