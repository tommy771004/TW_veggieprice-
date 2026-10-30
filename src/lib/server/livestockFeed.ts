/**
 * Livestock / pork feed — deep module for latest-livestock.json.
 */
import { unstable_cache } from "next/cache";
import fs from "fs";
import path from "path";
import {
  dateLabel,
  dateRange,
  isoToROC,
  normalizeMoaDate,
  subtractDays,
  todayISO,
} from "@/lib/server/dateUtils";
import type { LivestockPrices } from "@/lib/types";
import {
  buildMarketOverviewTrendPoints,
  type MarketOverviewTrendValue,
} from "@/lib/server/marketOverviewCore";
import type { MarketOverviewTrendResult } from "@/lib/server/marketOverviewTypes";

export type {
  MarketOverviewTrendPoint,
  MarketOverviewTrendResult,
} from "@/lib/server/marketOverviewTypes";

/** 雞蛋/白肉雞行情 API 回傳結構（PoultryTransType_BoiledChicken_Eggs）
 *  欄位名稱可能隨農業部改版異動，使用 safeNumericField 存取以便偵測。 */
export type RawEggChickenRecord = Record<string, unknown> & { TransDate: string };

/** 毛豬交易行情 API 回傳結構（PorkTransType） */
export interface RawPorkRecord {
  TransDate: string;
  MarketName: string;
  TransNum_Total: number | string;
  TransNum_AvgPrice: number | string;
}

/** 紅羽/黑羽土雞行情 API 回傳結構（PoultryTransType_RedFeather） */
type RawRedFeatherRecord = Record<string, unknown> & { TransDate: string };

/** 肉鵝/肉鴨/鴨蛋行情 API 回傳結構（PoultryTransType_Goose_Duck_Duckegg） */
type RawGooseDuckRecord = Record<string, unknown> & { TransDate: string };

/** 羊拍賣行情 API 回傳結構（SheepQuotation） */
interface RawSheepRecord {
  transDate: string;
  avgPrice?: string | number;
  name?: string;
  shortName?: string;
  quantity?: string | number;
  date?: string;
}

/** latest-livestock.json 的 data 物件結構 */
export interface LivestockLocalData {
  egg_chicken?: RawEggChickenRecord[];
  pork?: RawPorkRecord[];
  red_feather?: RawRedFeatherRecord[];
  goose_duck?: RawGooseDuckRecord[];
  sheep?: RawSheepRecord[];
}

// Safely reads a numeric field from a livestock API record.
// Falls back to alternative field names when the primary is absent, and logs a warning
// so that upstream API schema changes are surfaced in server logs instead of silently returning null.
export function safeNumericField(
  record: Record<string, unknown> | null | undefined,
  primary: string,
  ...fallbacks: string[]
): number | null {
  if (!record) return null;
  for (const key of [primary, ...fallbacks]) {
    const raw = record[key];
    if (raw !== undefined && raw !== null && raw !== "") {
      const val = parseFloat(String(raw));
      if (!isNaN(val)) return val;
    }
  }
  if (Object.keys(record).length > 0) {
    console.warn(
      `[livestock] Expected field "${primary}" not found. Available keys: ${Object.keys(record).slice(0, 10).join(", ")}`,
    );
  }
  return null;
}

/** 加權平均毛豬價格（依成交頭數加權）；無資料時回傳 null。*/
function weightedPorkAvg(records: RawPorkRecord[]): number | null {
  const totalHead = records.reduce(
    (s, r) => s + (Number(r.TransNum_Total) || 0),
    0,
  );
  if (totalHead === 0) return null;
  const weighted = records.reduce(
    (s, r) => s + Number(r.TransNum_AvgPrice) * (Number(r.TransNum_Total) || 0),
    0,
  );
  return Math.round((weighted / totalHead) * 10) / 10;
}

/** 簡單平均羊拍賣均價；無資料時回傳 null。*/
function avgSheep(records: RawSheepRecord[]): number | null {
  const valid = records
    .map((r) => parseFloat(String(r.avgPrice)))
    .filter((n) => !isNaN(n) && n > 0);
  if (valid.length === 0) return null;
  return (
    Math.round((valid.reduce((acc, v) => acc + v, 0) / valid.length) * 10) / 10
  );
}

const fetchLivestockPricesCached = unstable_cache(
  async (): Promise<LivestockPrices> => {
    const endISO = todayISO();
    const startISO = subtractDays(endISO, 30);

    let livestockData: LivestockLocalData = {};
    const localFile = path.join(
      process.cwd(),
      "public",
      "data",
      "latest-livestock.json",
    );
    if (fs.existsSync(localFile)) {
      try {
        const fileContent = await fs.promises.readFile(localFile, "utf-8");
        const parsed = JSON.parse(fileContent);
        livestockData = parsed.data || {};
      } catch (err) {
        console.warn("Failed to read latest-livestock.json", err);
      }
    }

    // Attempt to fallback to live APIs if local data is completely empty (e.g. not fetched yet)
    // To respect limitations, we only fallback for the critical data (pork/egg) if needed.
    const porkDates = new Set(
      (livestockData.pork || []).map((r) => r.TransDate),
    );
    console.log("Pork dates before fetch:", porkDates.size);
    if (!livestockData.egg_chicken || porkDates.size < 2) {
      console.log("Fall back to live API for basic livestock info");
      const startGregorian = startISO.replace(/-/g, "/");
      const endGregorian = endISO.replace(/-/g, "/");
      const startROC = isoToROC(startISO);
      const endROC = isoToROC(endISO);

      const [eggRes, porkRes] = await Promise.all([
        !livestockData.egg_chicken
          ? fetch(
              `https://data.moa.gov.tw/api/v1/PoultryTransType_BoiledChicken_Eggs/?Start_time=${startGregorian}&End_time=${endGregorian}`,
              {
                headers: {
                  Accept: "application/json",
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                  Connection: "close",
                },
                cache: "no-store",
              },
            ).catch(() => null)
          : Promise.resolve(null),
        porkDates.size < 2
          ? fetch(
              `https://data.moa.gov.tw/api/v1/PorkTransType/?Start_time=${startROC}&End_time=${endROC}`,
              {
                headers: {
                  Accept: "application/json",
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                  Connection: "close",
                },
                cache: "no-store",
              },
            ).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (eggRes && eggRes.ok)
        livestockData.egg_chicken = (await eggRes.json()).Data || [];
      if (porkRes && porkRes.ok)
        livestockData.pork = (await porkRes.json()).Data || [];
      console.log(
        "Pork dates after fetch:",
        new Set((livestockData.pork || []).map((r) => r.TransDate)).size,
      );
    }

    // --- Egg & Chicken prices ---
    const eggData = (livestockData.egg_chicken ?? []).sort((a, b) =>
      b.TransDate.localeCompare(a.TransDate),
    );
    const latestEgg = eggData[0];
    const prevEgg = eggData.find((r) => r.TransDate !== latestEgg?.TransDate);
    const eggPrice = safeNumericField(latestEgg, "egg_Price");
    const prevEggPrice = safeNumericField(prevEgg, "egg_Price");
    const eggPriceChange =
      eggPrice !== null && prevEggPrice !== null && prevEggPrice > 0
        ? Math.round(((eggPrice - prevEggPrice) / prevEggPrice) * 1000) / 10
        : null;

    // 'TaijinPrice_2.0kgup' is the primary field name as of 2024; include known variants as fallbacks
    const chickenPrice = safeNumericField(
      latestEgg,
      "TaijinPrice_2.0kgup",
      "TaijinPrice_2kg_up",
      "TaijinPrice",
    );
    const prevChickenPrice = safeNumericField(
      prevEgg,
      "TaijinPrice_2.0kgup",
      "TaijinPrice_2kg_up",
      "TaijinPrice",
    );
    const chickenPriceChange =
      chickenPrice !== null && prevChickenPrice !== null && prevChickenPrice > 0
        ? Math.round(
            ((chickenPrice - prevChickenPrice) / prevChickenPrice) * 1000,
          ) / 10
        : null;

    // --- Pork prices ---
    const porkData = (livestockData.pork ?? []).sort((a, b) =>
      b.TransDate.localeCompare(a.TransDate),
    );
    const latestPorkDate = porkData[0]?.TransDate;
    const prevPorkDate = porkData.find(
      (r) => r.TransDate !== latestPorkDate,
    )?.TransDate;
    const todayPork = porkData.filter((r) => r.TransDate === latestPorkDate);
    const prevPork = porkData.filter((r) => r.TransDate === prevPorkDate);
    const porkAvgPrice = weightedPorkAvg(todayPork);
    const prevPorkAvgPrice = weightedPorkAvg(prevPork);
    const porkPriceChange =
      porkAvgPrice !== null && prevPorkAvgPrice !== null && prevPorkAvgPrice > 0
        ? Math.round(
            ((porkAvgPrice - prevPorkAvgPrice) / prevPorkAvgPrice) * 1000,
          ) / 10
        : null;
    const porkTotalHeads = todayPork.reduce(
      (s, r) => s + (Number(r.TransNum_Total) || 0),
      0,
    );
    const prevPorkTotalHeads = prevPork.reduce(
      (s, r) => s + (Number(r.TransNum_Total) || 0),
      0,
    );
    const porkVolumeChange =
      porkTotalHeads > 0 && prevPorkTotalHeads > 0
        ? Math.round(
            ((porkTotalHeads - prevPorkTotalHeads) / prevPorkTotalHeads) *
              1000,
          ) / 10
        : null;

    // --- Red Feather Chicken ---
    const redFeatherData = (livestockData.red_feather ?? []).sort((a, b) =>
      b.TransDate.localeCompare(a.TransDate),
    );
    const latestRedFeather = redFeatherData[0];
    const prevRedFeather = redFeatherData.find(
      (r) => r.TransDate !== latestRedFeather?.TransDate,
    );
    // take RedFeather_C_M (Central Male) or North Male as fallback
    const redFeatherChickenPrice = safeNumericField(
      latestRedFeather,
      "RedFeather_C_M",
      "RedFeather_N_M",
    );
    const prevRedFeatherChickenPrice = safeNumericField(
      prevRedFeather,
      "RedFeather_C_M",
      "RedFeather_N_M",
    );
    const redFeatherChickenPriceChange =
      redFeatherChickenPrice !== null &&
      prevRedFeatherChickenPrice !== null &&
      prevRedFeatherChickenPrice > 0
        ? Math.round(
            ((redFeatherChickenPrice - prevRedFeatherChickenPrice) /
              prevRedFeatherChickenPrice) *
              1000,
          ) / 10
        : null;

    // --- Goose and Duck ---
    const gooseDuckData = (livestockData.goose_duck ?? []).sort((a, b) =>
      b.TransDate.localeCompare(a.TransDate),
    );
    const latestGooseDuck = gooseDuckData[0];
    const prevGooseDuck = gooseDuckData.find(
      (r) => r.TransDate !== latestGooseDuck?.TransDate,
    );
    const goosePrice = safeNumericField(
      latestGooseDuck,
      "Goose_WR_TaijinPrice",
      "Goose_TaijinPrice",
    );
    const duckPrice = safeNumericField(
      latestGooseDuck,
      "Duck_75D_TaijinPrice",
      "Duck_TaijinPrice",
    );
    const prevGoosePrice = safeNumericField(
      prevGooseDuck,
      "Goose_WR_TaijinPrice",
      "Goose_TaijinPrice",
    );
    const prevDuckPrice = safeNumericField(
      prevGooseDuck,
      "Duck_75D_TaijinPrice",
      "Duck_TaijinPrice",
    );
    const goosePriceChange =
      goosePrice !== null && prevGoosePrice !== null && prevGoosePrice > 0
        ? Math.round(((goosePrice - prevGoosePrice) / prevGoosePrice) * 1000) /
          10
        : null;
    const duckPriceChange =
      duckPrice !== null && prevDuckPrice !== null && prevDuckPrice > 0
        ? Math.round(((duckPrice - prevDuckPrice) / prevDuckPrice) * 1000) / 10
        : null;

    // --- Sheep prices ---
    const sheepData = (livestockData.sheep ?? []).sort((a, b) =>
      b.transDate.localeCompare(a.transDate),
    );
    const latestSheepDate = sheepData[0]?.transDate;
    const prevSheepDate = sheepData.find(
      (r) => r.transDate !== latestSheepDate,
    )?.transDate;
    const todaySheep = sheepData.filter((r) => r.transDate === latestSheepDate);
    const prevSheep = sheepData.filter((r) => r.transDate === prevSheepDate);
    const sheepAvgPrice = avgSheep(todaySheep);
    const prevSheepAvgPrice = avgSheep(prevSheep);
    const sheepAvgPriceChange =
      sheepAvgPrice !== null &&
      prevSheepAvgPrice !== null &&
      prevSheepAvgPrice > 0
        ? Math.round(
            ((sheepAvgPrice - prevSheepAvgPrice) / prevSheepAvgPrice) * 1000,
          ) / 10
        : null;

    // Prefer pork trading day when the homepage meat hero shows pork avg price.
    const porkIso = latestPorkDate
      ? normalizeMoaDate(String(latestPorkDate))
      : "";
    const eggIso = latestEgg?.TransDate
      ? normalizeMoaDate(String(latestEgg.TransDate))
      : "";
    const livestockDate =
      porkIso || eggIso || todayISO();

    return {
      date: livestockDate,
      eggPrice,
      eggProducerPrice: safeNumericField(latestEgg, "egg_Producer_Price"),
      porkAvgPrice,
      porkTotalHeads: porkTotalHeads > 0 ? porkTotalHeads : null,
      porkVolumeChange,
      eggPriceChange,
      porkPriceChange,
      chickenPrice,
      chickenPriceChange,
      redFeatherChickenPrice,
      redFeatherChickenPriceChange,
      goosePrice,
      goosePriceChange,
      duckPrice,
      duckPriceChange,
      sheepAvgPrice,
      sheepAvgPriceChange,
    };
  },
  ["moa-livestock-prices-v3"],
  { revalidate: 300, tags: ["moa-livestock-prices"] },
);

export async function fetchLivestockPrices(): Promise<LivestockPrices> {
  return fetchLivestockPricesCached();
}

/**
 * National pork average trend from latest-livestock.json (weighted by head count).
 * Replaces invented meat trend series so charts only show real trading days.
 */
export async function fetchLivestockPorkTrend(
  days: number,
): Promise<MarketOverviewTrendResult> {
  const normalizedDays = Math.min(Math.max(Math.floor(days), 1), 30);

  const localFile = path.join(
    process.cwd(),
    "public",
    "data",
    "latest-livestock.json",
  );
  let pork: RawPorkRecord[] = [];
  if (fs.existsSync(localFile)) {
    try {
      const fileContent = await fs.promises.readFile(localFile, "utf-8");
      const parsed = JSON.parse(fileContent);
      const data = (parsed.data || {}) as LivestockLocalData;
      pork = data.pork ?? [];
    } catch {
      return { points: [], error: "讀取肉品趨勢資料失敗" };
    }
  }

  if (pork.length === 0) {
    return { points: [], error: "查無市場趨勢資料" };
  }

  const byDate = new Map<string, RawPorkRecord[]>();
  for (const r of pork) {
    const iso = normalizeMoaDate(String(r.TransDate ?? ""));
    if (!iso) continue;
    const bucket = byDate.get(iso) ?? [];
    bucket.push(r);
    byDate.set(iso, bucket);
  }

  const tradingDates = [...byDate.keys()].sort();
  if (tradingDates.length === 0) {
    return { points: [], error: "查無市場趨勢資料" };
  }

  const endDate = tradingDates[tradingDates.length - 1];
  const startDate = subtractDays(endDate, Math.max(normalizedDays - 1, 0));

  const valuesByDate = new Map<string, MarketOverviewTrendValue>();
  for (const date of dateRange(startDate, endDate)) {
    const rows = byDate.get(date);
    if (!rows || rows.length === 0) continue;

    const avgPrice = weightedPorkAvg(rows);
    const volume = rows.reduce(
      (s, r) => s + (Number(r.TransNum_Total) || 0),
      0,
    );
    valuesByDate.set(date, {
      avgPrice,
      volume: volume > 0 ? volume : null,
    });
  }

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
