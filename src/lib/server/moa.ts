import { unstable_cache } from "next/cache";
import fs from "fs";
import path from "path";
import {
  dateLabel,
  dateRange,
  isoToROC,
  normalizeMoaDate,
  periodToDays,
  rocToISO,
  subtractDays,
  todayISO,
} from "@/lib/server/dateUtils";
import type {
  ProducePrice,
  LivestockPrices,
  SeasonalItem,
  TraceabilitySummaryItem,
  ProductCostInsight,
  CostSurveyFile,
} from "@/lib/types";
import { CROP_DESCRIPTIONS, getProduceCategory, type ProduceCategory } from "@/lib/produce";
import { getCropEmoji } from "@/lib/utils";
import { resolveCountyFromMarketName as resolveCountyFromMarketDataset } from "@/lib/server/marketCountyMap";
import { DEFAULT_MARKET, ALL_MARKET_SENTINEL } from "@/lib/constants";
import { marketsMatch } from "@/lib/markets";
import { buildInterpolatedHistory } from "@/lib/server/historyAggregation";
import { makeLogger } from "@/lib/server/logger";
import {
  buildMarketOverviewTrendPoints,
  type MarketOverviewTrendValue,
} from "@/lib/server/marketOverviewCore";
import type {
  MarketOverviewTrendPoint,
  MarketOverviewTrendResult,
} from "@/lib/server/marketOverviewTypes";
import {
  fetchLivestockPrices,
  fetchLivestockPorkTrend,
  safeNumericField,
  type LivestockLocalData,
} from "@/lib/server/livestockFeed";
import {
  fetchLatestSeafoodData,
  fetchSeafoodMarketDailySummaries,
  fetchSeafoodMarketOverview,
  fetchSeafoodMarketTrend,
  type SeafoodMarketDaySummary,
  type SeafoodRawRecord,
} from "@/lib/server/seafoodFeed";

const log = makeLogger("moa");

const MOA_BASE =
  process.env.MOA_API_BASE_URL ??
  "https://data.moa.gov.tw/api/v1/AgriProductsTransType/";
const MOA_API_ROOT =
  process.env.MOA_API_ROOT_URL ?? "https://data.moa.gov.tw/api/v1";
const FETCH_TIMEOUT_MS = Number(process.env.MOA_FETCH_TIMEOUT_MS ?? "25000");
/** MOA API 每頁請求的最大重試次數（initial 嘗試本身不計入）。
 *  使用指數退避 + Full-Jitter 避免對半死不活的上游造成雪崩（Thundering Herd）。 */
const MOA_FETCH_RETRIES = 2;

/** MOA 農產品種類代碼（農業部 OpenData 規格） */
export const CROP_TYPE_VEG = "N04" as const; // 蔬菜
export const CROP_TYPE_FRUIT = "N05" as const; // 水果
export const CROP_TYPE_FLOWER = "N06" as const; // 花卉
/** 每批次的平行 HTTP 請求數量；數字過大會造成 Serverless 函數的並發限制 */
const MOA_PAGE_BATCH = 3 as const;

const MARKET_TYPE_OPTIONS = [
  { value: "Veg", label: "蔬菜市場", description: "蔬菜批發市場即時行情" },
  { value: "Fruit", label: "水果市場", description: "水果批發市場即時行情" },
  { value: "Flower", label: "花卉市場", description: "花卉批發市場交易行情" },
  { value: "meat", label: "肉品家禽", description: "畜產品交易行情" },
  { value: "seafood", label: "漁產市場", description: "漁產品交易行情" },
] as const;

type MarketType = (typeof MARKET_TYPE_OPTIONS)[number]["value"];

function normalizeMarketType(input: string): MarketType {
  return MARKET_TYPE_OPTIONS.some((option) => option.value === input)
    ? (input as MarketType)
    : "Veg";
}

export interface MarketTypeOption {
  value: MarketType;
  label: string;
  description: string;
}

export interface MarketOptionsResult {
  marketTypes: MarketTypeOption[];
  marketsByType: Record<MarketType, string[]>;
  defaultMarketType: MarketType;
  defaultMarket: string;
  dateRanges: Array<{ label: string; value: "1d" | "1w" | "1m" }>;
  pricePeriods: Array<"1W" | "1M" | "3M" | "1Y">;
  source: string;
  updatedAt: string;
  error?: string;
}

export interface MarketRestDay {
  marketName: string;
  date: string;
  note?: string;
}

export interface MarketRestDayResult {
  items: MarketRestDay[];
  error?: string;
}

export interface MarketWeatherObservation {
  stationName: string;
  county: string;
  observedAt: string;
  temperatureC: number | null;
  rainfallMm: number | null;
  humidityPct: number | null;
}

export interface MarketWeatherObservationResult {
  items: MarketWeatherObservation[];
  error?: string;
}

interface MOARawRecord {
  MarketName: string;
  CropCode: string;
  CropName: string;
  // The MOA API v1 endpoint may return price/quantity fields as strings in some responses;
  // using `number | string` forces callers to go through `Number()` rather than relying on implicit coercion.
  Upper_Price: number | string;
  Middle_Price: number | string;
  Lower_Price: number | string;
  Avg_Price: number | string;
  Trans_Quantity: number | string;
  TransDate: string;
}

/** Shape of one record stored in public/data/daily/YYYY-MM-DD.json by fetch-moa-data.js */
interface LocalDailyRecord {
  CropCode?: string;
  CropName?: string;
  MarketName?: string;
  Upper_Price?: number | string;
  Middle_Price?: number | string;
  Lower_Price?: number | string;
  Avg_Price?: number | string;
  Trans_Quantity?: number | string;
  TransDate?: string;
  TcType?: string;
}

export interface NormalizedPriceRecord {
  cropCode: string;
  cropName: string;
  marketName: string;
  grade: string;
  upperPrice: number;
  middlePrice: number;
  lowerPrice: number;
  avgPrice: number;
  transWeight: number;
  date: string;
}

export interface HistoryPoint {
  date: string;
  label: string;
  avgPrice: number | null;
  upperPrice: number | null;
  lowerPrice: number | null;
  volume: number | null;
  isClosed: boolean;
}

export interface FetchMarketDataResult {
  data: HistoryPoint[];
  closedDays: string[];
  error?: string;
}

export interface SearchRecordsResult {
  records: ProducePrice[];
  error?: string;
}

export type {
  MarketOverviewTrendPoint,
  MarketOverviewTrendResult,
} from "@/lib/server/marketOverviewTypes";

interface MarketDailyAggregate {
  priceSum: number;
  priceCount: number;
  volumeSum: number;
  recordCount: number;
}

interface PriceQueryOptions {
  cropName?: string;
  market?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  marketType?: string;
}

function parseRecord(record: MOARawRecord): NormalizedPriceRecord {
  return {
    cropCode: record.CropCode ?? "",
    cropName: record.CropName ?? "",
    marketName: record.MarketName ?? "",
    grade: "一般",
    upperPrice: Number(record.Upper_Price) || 0,
    middlePrice: Number(record.Middle_Price) || 0,
    lowerPrice: Number(record.Lower_Price) || 0,
    avgPrice: Number(record.Avg_Price) || 0,
    transWeight: Number(record.Trans_Quantity) || 0,
    date: rocToISO(record.TransDate ?? ""),
  };
}

const MAX_PAGES = 50;

function readStringField(
  record: Record<string, unknown>,
  candidates: string[],
): string {
  for (const field of candidates) {
    const value = record[field];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return "";
}

function textContainsKeyword(value: string, keyword: string): boolean {
  if (!value || !keyword) return false;
  const normalizedValue = value.replace(/\s+/g, "").toLowerCase();
  const normalizedKeyword = keyword.replace(/\s+/g, "").toLowerCase();
  return normalizedValue.includes(normalizedKeyword);
}

function readNumberField(
  record: Record<string, unknown>,
  candidates: string[],
): number | null {
  for (const field of candidates) {
    const value = record[field];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function pickCostPerKg(record: Record<string, unknown>): number | null {
  const directCost = readNumberField(record, [
    "CostPerKg",
    "AverageCostPerKg",
    "AvgCostPerKg",
    "UnitCost",
    "Cost",
    "AverageCost",
  ]);

  if (directCost !== null && directCost > 0 && directCost < 1000) {
    return directCost;
  }

  const totalCost = readNumberField(record, [
    "TotalCost",
    "ProductionCost",
    "CostTotal",
  ]);
  const quantity = readNumberField(record, [
    "YieldKg",
    "QuantityKg",
    "ProductionQuantityKg",
  ]);

  if (
    totalCost !== null &&
    quantity !== null &&
    totalCost > 0 &&
    quantity > 0
  ) {
    const derived = totalCost / quantity;
    if (Number.isFinite(derived) && derived > 0 && derived < 1000) {
      return derived;
    }
  }

  return null;
}

/**
 * 通用重試包裝器 — 指數退避 + Full-Jitter。
 *
 * Full-Jitter 公式：delay = random(0, min(MAX_CAP, base * 2^attempt))
 * 比固定延遲更能分散重試請求，避免對已有壓力的上游再造成同步突波（Thundering Herd）。
 *
 * 僅重試 5xx / 網路層錯誤；4xx（資料不存在）直接拋出，不做無意義重試。
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MOA_FETCH_RETRIES,
  baseDelayMs: number = 500,
): Promise<T> {
  const MAX_DELAY_MS = 20000;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // 4xx 是永久性錯誤（資源不存在、參數錯誤）——不重試
      if (err instanceof Error && err.message.match(/^MOA.*HTTP 4\d\d/))
        throw err;
      if (attempt === retries) break;
      const ceiling = Math.min(
        MAX_DELAY_MS,
        baseDelayMs * Math.pow(2, attempt),
      );
      const delay = Math.floor(Math.random() * ceiling);
      log.warn("fetch retry", {
        attempt: attempt + 1,
        maxRetries: retries,
        delayMs: delay,
        error: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function fetchMOARecords(
  params: URLSearchParams,
  maxPages: number = MAX_PAGES,
): Promise<MOARawRecord[]> {
  const fetchPage = async (
    page: number,
  ): Promise<{ records: MOARawRecord[]; hasNext: boolean }> => {
    const pageParams = new URLSearchParams(params);
    if (page > 1) pageParams.set("Page", String(page));

    const pageController = new AbortController();
    const pageTimer = setTimeout(
      () => pageController.abort(),
      FETCH_TIMEOUT_MS,
    );

    try {
      const response = await fetch(`${MOA_BASE}?${pageParams}`, {
        signal: pageController.signal,
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Connection: "close",
        },
        cache: "no-store",
      });
      log.info("moa fetch", {
        url: `${MOA_BASE}?${pageParams}`,
        status: response.status,
      });
      if (!response.ok) throw new Error(`MOA returned HTTP ${response.status}`);
      const text = await response.text();
      // MOA 有時在維護期間以 200 回傳 HTML 錯誤頁；必須在 JSON.parse 前偵測並拋出，
      // 讓 withRetry 決定是否重試，而非讓 SyntaxError 靜默地層層上拋。
      if (text.trimStart().startsWith("<")) {
        throw new Error(
          `MOA returned HTML instead of JSON (HTTP ${response.status}): ${text.substring(0, 120).replace(/\s+/g, " ")}`,
        );
      }
      const json = JSON.parse(text) as { Data: MOARawRecord[]; Next: boolean };
      const records = json.Data ?? [];
      return { records, hasNext: !!(json.Next && records.length > 0) };
    } finally {
      clearTimeout(pageTimer);
    }
  };

  const { records: firstRecords, hasNext: firstHasNext } = await withRetry(() =>
    fetchPage(1),
  );
  if (!firstHasNext || maxPages <= 1) return firstRecords;

  const allRecords: MOARawRecord[] = [...firstRecords];
  for (let start = 2; start <= maxPages; start += MOA_PAGE_BATCH) {
    const end = Math.min(start + MOA_PAGE_BATCH - 1, maxPages);
    const batch = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, i) =>
        withRetry(() => fetchPage(start + i)),
      ),
    );
    for (const { records, hasNext } of batch) {
      allRecords.push(...records);
      if (!hasNext) return allRecords;
    }
  }
  return allRecords;
}

async function fetchMOAEndpointRecords<T extends object>(
  endpoint: string,
  params: URLSearchParams,
  maxPages: number = MAX_PAGES,
): Promise<T[]> {
  const fetchPage = async (
    page: number,
  ): Promise<{ records: T[]; hasNext: boolean }> => {
    const pageParams = new URLSearchParams(params);
    if (page > 1) pageParams.set("Page", String(page));

    const pageController = new AbortController();
    const pageTimer = setTimeout(
      () => pageController.abort(),
      FETCH_TIMEOUT_MS,
    );

    try {
      const response = await fetch(
        `${MOA_API_ROOT}/${endpoint}/?${pageParams}`,
        {
          signal: pageController.signal,
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Connection: "close",
          },
          cache: "no-store",
        },
      );
      if (!response.ok)
        throw new Error(`MOA ${endpoint} returned HTTP ${response.status}`);
      const text = await response.text();
      if (text.trimStart().startsWith("<")) {
        throw new Error(
          `MOA ${endpoint} returned HTML instead of JSON (HTTP ${response.status}): ${text.substring(0, 120).replace(/\s+/g, " ")}`,
        );
      }
      const json = JSON.parse(text) as { Data?: T[]; Next?: boolean };
      const records = json.Data ?? [];
      return { records, hasNext: !!(json.Next && records.length > 0) };
    } finally {
      clearTimeout(pageTimer);
    }
  };

  const { records: firstRecords, hasNext: firstHasNext } = await withRetry(() =>
    fetchPage(1),
  );
  if (!firstHasNext || maxPages <= 1) return firstRecords;

  const allRecords: T[] = [...firstRecords];
  for (let start = 2; start <= maxPages; start += MOA_PAGE_BATCH) {
    const end = Math.min(start + MOA_PAGE_BATCH - 1, maxPages);
    const batch = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, i) =>
        withRetry(() => fetchPage(start + i)),
      ),
    );
    for (const { records, hasNext } of batch) {
      allRecords.push(...records);
      if (!hasNext) return allRecords;
    }
  }
  return allRecords;
}

const FALLBACK_VEG_MARKETS = [
  "全部市場",
  "台北一",
  "台北二",
  "板橋區",
  "三重區",
  "宜蘭地區",
  "台中市",
  "南投市",
  "埔里鎮",
  "溪湖鎮",
  "西螺鎮",
  "高雄市",
  "鳳山區",
  "屏東市",
  "台東市",
  "花蓮市",
];

const FALLBACK_FRUIT_MARKETS = [
  "全部市場",
  "台北一",
  "台北二",
  "板橋區",
  "三重區",
  "宜蘭地區",
  "東勢鎮",
  "台中市",
  "嘉義市",
  "高雄市",
  "鳳山區",
  "屏東市",
  "台東市",
  "花蓮市",
  "豐原區",
  "員林鎮",
];

// 花卉批發市場名稱，需與 daily 資料裡的 MarketName 完全一致（依市場精確比對）。
const FALLBACK_FLOWER_MARKETS = [
  "全部市場",
  "台北市場",
  "台中市場",
  "彰化市場",
  "台南市場",
  "高雄市場",
];

export interface MOAMarket {
  MarketCode: string;
  MarketName: string;
}

async function fetchLivestockMarketsUncached(): Promise<string[]> {
  try {
    const localFile = path.join(
      process.cwd(),
      "public",
      "data",
      "latest-livestock.json",
    );
    const fileContent = await fs.promises.readFile(localFile, "utf-8");
    const parsed = JSON.parse(fileContent);
    const data: LivestockLocalData = parsed.data || {};

    const markets = new Set<string>(["全國平均"]);

    if (data.pork) {
      for (const r of data.pork) {
        if (r.MarketName) markets.add(r.MarketName);
      }
    }

    if (data.sheep) {
      for (const r of data.sheep) {
        if (r.name) markets.add(r.name);
      }
    }

    return Array.from(markets);
  } catch {
    return ["全國平均"];
  }
}

const fetchLivestockMarketsCached = unstable_cache(
  fetchLivestockMarketsUncached,
  ["moa-livestock-markets-v1"],
  { revalidate: 3600 },
);

export async function fetchMarkets(type: string = "Veg"): Promise<string[]> {
  const normalizedType = normalizeMarketType(type);

  if (normalizedType === "meat") {
    return fetchLivestockMarketsCached();
  }
  if (normalizedType === "seafood") {
    const cachedFn = unstable_cache(
      async (): Promise<string[]> => {
        const allMarkets = new Set<string>();
        allMarkets.add("全部市場");
        try {
          const records = await fetchMOAEndpointRecords<{
            SeafoodMarketName?: string;
          }>("SeafoodProdMarketType", new URLSearchParams(), 1);
          for (const record of records) {
            if (record.SeafoodMarketName) {
              allMarkets.add(record.SeafoodMarketName);
            }
          }
        } catch (e) {
          console.error("Failed to fetch seafood markets", e);
        }
        return Array.from(allMarkets);
      },
      ["moa-markets", normalizedType],
      { revalidate: 86400 }, // 24 hours
    );
    return cachedFn();
  }
  if (normalizedType === "Flower") {
    // MOA 的 CropMarketType 端點不含花卉市場；花卉固定為 5 個花卉批發市場，
    // 直接回傳（名稱與 daily 資料的 MarketName 一致，供精確比對）。
    return FALLBACK_FLOWER_MARKETS;
  }

  const cachedFn = unstable_cache(
    async (): Promise<string[]> => {
      const allMarkets = new Set<string>();
      allMarkets.add("全部市場");
      const params = new URLSearchParams({ CropMarketType: normalizedType });
      const records = await fetchMOAEndpointRecords<MOAMarket>(
        "CropMarketType",
        params,
        2,
      );
      for (const record of records) {
        if (record.MarketName) {
          allMarkets.add(record.MarketName);
        }
      }
      return Array.from(allMarkets);
    },
    ["moa-markets-list-v4", normalizedType],
    { revalidate: 3600 },
  );

  try {
    const list = await cachedFn();
    if (list.length <= 1) {
      if (normalizedType === "Veg") return FALLBACK_VEG_MARKETS;
      if (normalizedType === "Fruit") return FALLBACK_FRUIT_MARKETS;
      // if (normalizedType === 'Flower') return FALLBACK_FLOWER_MARKETS
    }
    return list;
  } catch (error) {
    console.error("Failed to fetch markets", error);
    if (normalizedType === "Veg") return FALLBACK_VEG_MARKETS;
    if (normalizedType === "Fruit") return FALLBACK_FRUIT_MARKETS;
    // if (normalizedType === 'Flower') return FALLBACK_FLOWER_MARKETS
    return ["全部市場"];
  }
}

const fetchMarketOptionsCached = unstable_cache(
  async (): Promise<MarketOptionsResult> => {
    const entries = await Promise.all(
      MARKET_TYPE_OPTIONS.map(async (option) => {
        const markets = await fetchMarkets(option.value);
        return [option.value, markets] as const;
      }),
    );

    const marketsByType = Object.fromEntries(entries) as Record<
      MarketType,
      string[]
    >;
    const vegMarkets = marketsByType.Veg ?? [ALL_MARKET_SENTINEL];
    const defaultMarket = vegMarkets.includes(DEFAULT_MARKET)
      ? DEFAULT_MARKET
      : (vegMarkets.find((market) => market !== ALL_MARKET_SENTINEL) ??
        ALL_MARKET_SENTINEL);

    return {
      marketTypes: [...MARKET_TYPE_OPTIONS],
      marketsByType,
      defaultMarketType: "Veg",
      defaultMarket,
      dateRanges: [
        { label: "今日", value: "1d" },
        { label: "近一週", value: "1w" },
        { label: "近一月", value: "1m" },
      ],
      pricePeriods: ["1W", "1M", "3M", "1Y"],
      source: "https://data.moa.gov.tw/api.aspx",
      updatedAt: new Date().toISOString(),
    };
  },
  ["moa-market-options-v5"],
  { revalidate: 3600 },
);

export async function fetchMarketOptions(): Promise<MarketOptionsResult> {
  try {
    return await fetchMarketOptionsCached();
  } catch (error) {
    return {
      marketTypes: [...MARKET_TYPE_OPTIONS],
      marketsByType: {
        Veg: ["全部市場"],
        Fruit: ["全部市場"],
        Flower: ["全部市場"],
        meat: ["全國平均"],
        seafood: ["全部市場"],
      },
      defaultMarketType: "Veg",
      defaultMarket: "全部市場",
      dateRanges: [
        { label: "今日", value: "1d" },
        { label: "近一週", value: "1w" },
        { label: "近一月", value: "1m" },
      ],
      pricePeriods: ["1W", "1M", "3M", "1Y"],
      source: "https://data.moa.gov.tw/api.aspx",
      updatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown MOA fetch error",
    };
  }
}

// MOA rest-day datasets tag each entry with a product-category code (the section of
// the market that is closed). Localize to Traditional Chinese so the UI never shows
// raw codes like "F"/"Fish". Unknown codes return undefined → no badge is rendered.
const MARKET_TYPE_LABELS: Record<string, string> = {
  V: "蔬菜",
  F: "水果",
  L: "花卉",
  Fish: "漁產",
};

function localizeMarketType(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return MARKET_TYPE_LABELS[code];
}

async function fetchMarketRestDaysUncached(
  market: string,
  startDate: string,
  endDate: string,
): Promise<MarketRestDayResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const fetchWcf = async (url: string) => {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        next: { revalidate: 3600 },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
      const text = await response.text();
      if (text.startsWith("<html") || text.startsWith("<!DOCTYPE html>")) {
        throw new Error(`MOA returned HTML instead of JSON for ${url}`);
      }
      return JSON.parse(text) as { Data: any[] };
    };

    const [farmRes, fishRes] = await Promise.allSettled([
      fetchWcf("https://data.moa.gov.tw/api/v1/MarketRestDayFarmWCF/"),
      fetchWcf("https://data.moa.gov.tw/api/v1/MarketRestDayFishWCF/"),
    ]);

    clearTimeout(timer);

    const records: any[] = [
      ...(farmRes.status === "fulfilled" ? farmRes.value?.Data || [] : []),
      ...(fishRes.status === "fulfilled" ? fishRes.value?.Data || [] : []),
    ];

    const seen = new Set<string>();
    const items: MarketRestDay[] = [];

    for (const record of records) {
      if (!record) continue;
      const marketName = record.MarkerName;
      if (!marketName) continue;

      if (
        market === "全部市場" ||
        marketName === market ||
        marketName.includes(market) ||
        market.includes(marketName)
      ) {
        const types = record.MarketTypeList || [];
        for (const type of types) {
          const years = type.YearList || [];
          for (const yr of years) {
            const yAD = Number(yr.Year) + 1911;
            if (isNaN(yAD)) continue;
            const yStr = String(yAD);
            const mList = yr.MonthList || [];
            for (const ml of mList) {
              const m = Number(ml.Month);
              if (isNaN(m)) continue;
              const mStr = String(m).padStart(2, "0");
              const restStr = ml.Rest || "";
              if (restStr.includes("無")) continue;

              const days = restStr
                .split("、")
                .map((d: string) => d.trim())
                .filter(Boolean);
              for (const d of days) {
                const dn = Number(d);
                if (isNaN(dn)) continue;
                const dateYMD = `${yStr}-${mStr}-${String(dn).padStart(2, "0")}`;

                // filter by date range
                if (dateYMD >= startDate && dateYMD <= endDate) {
                  const key = `${marketName}_${dateYMD}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    items.push({
                      marketName,
                      date: dateYMD,
                      note: localizeMarketType(type.MarketType),
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    items.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.marketName.localeCompare(b.marketName, "zh-TW"),
    );
    return { items };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : "Unknown MOA fetch error",
    };
  }
}

export async function fetchMarketRestDays(
  market: string,
  startDate: string,
  endDate: string,
): Promise<MarketRestDayResult> {
  const cachedFn = unstable_cache(
    () => fetchMarketRestDaysUncached(market, startDate, endDate),
    ["moa-market-rest-days-v1", market, startDate, endDate],
    { revalidate: 1800, tags: ["moa-market-rest-days"] },
  );

  return cachedFn();
}

function parseWeatherRecord(
  record: Record<string, unknown>,
  rainfallOnly: boolean,
): MarketWeatherObservation {
  return {
    stationName: readStringField(record, [
      "StationName",
      "SiteName",
      "Station",
      "Station_name",
    ]),
    county: readStringField(record, ["CountyName", "County", "City", "CITY"]),
    observedAt: normalizeMoaDate(
      readStringField(record, [
        "ObserveTime",
        "ObsTime",
        "DataDate",
        "TransDate",
        "TIME",
      ]),
    ),
    temperatureC: rainfallOnly
      ? null
      : readNumberField(record, ["AirTemperature", "Temperature", "TEMP"]),
    rainfallMm: readNumberField(record, [
      "DailyRainfall",
      "Rainfall",
      "RAIN",
      "Precipitation",
      "H_24R",
    ]),
    humidityPct: rainfallOnly
      ? null
      : readNumberField(record, ["RelativeHumidity", "Humidity", "RH", "HUMD"]),
  };
}

export async function fetchMarketWeatherObservations(
  county: string,
  limit: number = 20,
): Promise<MarketWeatherObservationResult> {
  const normalizedLimit = Math.max(1, Math.min(Math.floor(limit), 100));
  const cachedFn = unstable_cache(
    async (): Promise<MarketWeatherObservation[]> => {
      const params = new URLSearchParams();
      if (county) params.set("CITY", county);

      const [weatherRecords, rainfallRecords] = await Promise.all([
        fetchMOAEndpointRecords<Record<string, unknown>>(
          "AutoWeatherStationType",
          params,
          2,
        ),
        fetchMOAEndpointRecords<Record<string, unknown>>(
          "AutoRainfallStationType",
          params,
          2,
        ),
      ]);

      return [
        ...weatherRecords.map((r) => parseWeatherRecord(r, false)),
        ...rainfallRecords.map((r) => parseWeatherRecord(r, true)),
      ].filter((item) => item.stationName);
    },
    ["moa-weather-by-county-v2", county],
    { revalidate: 900, tags: ["moa-weather-observations"] },
  );

  try {
    const items = await cachedFn();
    return { items: items.slice(0, normalizedLimit) };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : "Unknown MOA fetch error",
    };
  }
}

export function resolveCountyFromMarketName(marketName: string): string {
  return resolveCountyFromMarketDataset(marketName);
}

// Friendly names for the upstream traceability systems, so the UI never shows raw
// API endpoint identifiers in the "來源" field.
const TRACE_SOURCE_LABELS: Record<string, string> = {
  TWAgriProductsTraceabilityType_ProductInfo: "臺灣農產品生產追溯（QR Code）",
  AgriProductsTraceabilityType: "產銷履歷（TAP）",
};

export async function fetchTraceabilitySummary(
  cropName: string,
  limit: number = 5,
): Promise<{ items: TraceabilitySummaryItem[]; error?: string }> {
  const normalizedLimit = Math.max(1, Math.min(Math.floor(limit), 10));

  const cachedFn = unstable_cache(
    async (): Promise<TraceabilitySummaryItem[]> => {
      const endpoints = [
        "TWAgriProductsTraceabilityType_ProductInfo",
        "AgriProductsTraceabilityType",
      ];
      const variants: Array<{
        query: Record<string, string>;
        maxPages: number;
        fallback?: boolean;
      }> = [
        { query: { Product: cropName }, maxPages: 2 },
        { query: { ProductName: cropName }, maxPages: 2 },
        { query: { CropName: cropName }, maxPages: 2 },
        { query: { Keyword: cropName }, maxPages: 2 },
        // Unfiltered fallback can be expensive. Only use it as a last resort.
        { query: {}, maxPages: 1, fallback: true },
      ];

      // Pre-normalize once — avoids repeated regex + toLowerCase per record in tight loops.
      const normalizedCropKeyword = cropName.replace(/\s+/g, "").toLowerCase();
      const matchesCrop = (value: string) =>
        value.replace(/\s+/g, "").toLowerCase().includes(normalizedCropKeyword);

      const records: Array<Record<string, unknown> & { __source?: string }> =
        [];
      let matchedCount = 0;

      for (const endpoint of endpoints) {
        for (const variant of variants) {
          if (variant.fallback && records.length > 0) {
            continue;
          }

          const params = new URLSearchParams();
          Object.entries(variant.query).forEach(([key, value]) =>
            params.set(key, value),
          );
          let batch: Record<string, unknown>[] = [];
          try {
            batch = await fetchMOAEndpointRecords<Record<string, unknown>>(
              endpoint,
              params,
              variant.maxPages,
            );
          } catch {
            // Keep trying other endpoints/parameter variants instead of failing whole API.
            continue;
          }
          if (batch.length === 0) continue;

          for (const item of batch) {
            const product = readStringField(item, [
              "Product",
              "ProductName",
              "CropName",
              "品名",
              "作物名稱",
            ]);
            if (matchesCrop(product)) matchedCount++;
            records.push({ ...item, __source: endpoint });
          }

          if (matchedCount >= normalizedLimit) break;
        }

        if (matchedCount >= normalizedLimit) break;
      }

      const dedup = new Map<string, TraceabilitySummaryItem>();

      for (const record of records) {
        const productName = readStringField(record, [
          "Product",
          "ProductName",
          "CropName",
          "品名",
          "作物名稱",
        ]);
        if (!matchesCrop(productName)) continue;

        const producerName =
          readStringField(record, [
            "ProducerName",
            "FarmerName",
            "Producer",
            "生產者",
          ]) || "未揭露";
        const traceCode =
          readStringField(record, [
            "TraceCode",
            "TraceabilityCode",
            "QRCode",
            "溯源編號",
          ]) || "未揭露";
        const county =
          readStringField(record, [
            "Place",
            "CountyName",
            "County",
            "City",
            "縣市",
          ]) || "未知";
        const mark =
          readStringField(record, ["Mark", "認驗證", "標章"]) || undefined;
        const sourceSystem = TRACE_SOURCE_LABELS[record.__source ?? ""] ?? "農產品溯源資訊";

        const key = `${productName}_${producerName}_${traceCode}`;
        if (dedup.has(key)) continue;

        dedup.set(key, {
          productName,
          producerName,
          traceCode,
          county,
          sourceSystem,
          mark,
        });

        if (dedup.size >= normalizedLimit) break;
      }

      return Array.from(dedup.values());
    },
    ["moa-traceability-summary-v2", cropName, String(normalizedLimit)],
    { revalidate: 21600 },
  );

  try {
    const items = await cachedFn();
    return { items };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : "Unknown MOA fetch error",
    };
  }
}

export async function fetchProductCostInsight(
  cropName: string,
): Promise<{ insight: ProductCostInsight | null; error?: string }> {
  const cachedFn = unstable_cache(
    async (): Promise<ProductCostInsight | null> => {
      const variants = [
        { CropName: cropName },
        { ProductName: cropName },
        { Keyword: cropName },
        {},
      ];

      let rows: Record<string, unknown>[] = [];
      for (const variant of variants) {
        const params = new URLSearchParams();
        Object.entries(variant).forEach(([key, value]) =>
          params.set(key, value),
        );
        rows = await fetchMOAEndpointRecords<Record<string, unknown>>(
          "ProductCost",
          params,
          3,
        );
        if (rows.length > 0) break;
      }

      const samples: number[] = [];
      const costFiles: CostSurveyFile[] = [];

      for (const row of rows) {
        const productName = readStringField(row, [
          "CropName",
          "ProductName",
          "品名",
          "作物名稱",
        ]);
        if (productName && !textContainsKeyword(productName, cropName))
          continue;

        const cost = pickCostPerKg(row);
        if (cost !== null) {
          samples.push(cost);
        }

        // Collect PDF links from ProductCost API
        const pdfUrl = readStringField(row, [
          "成本檔URL",
          "CostFileUrl",
          "FileUrl",
          "Url",
        ]);
        const yearStr = readStringField(row, ["年度", "Year"]);
        const year = yearStr ? parseInt(yearStr, 10) : 0;
        const group =
          readStringField(row, ["群組", "Group", "GroupName"]) || "";
        if (pdfUrl && year > 0) {
          costFiles.push({
            cropName: productName || cropName,
            year,
            pdfUrl,
            group,
          });
        }
      }

      if (samples.length === 0 && costFiles.length === 0) {
        return null;
      }

      const avg =
        samples.length > 0
          ? samples.reduce((sum, v) => sum + v, 0) / samples.length
          : null;
      const min = samples.length > 0 ? Math.min(...samples) : null;
      const max = samples.length > 0 ? Math.max(...samples) : null;

      return {
        cropName,
        avgCostPerKg: avg !== null ? Math.round(avg * 10) / 10 : null,
        minCostPerKg: min !== null ? Math.round(min * 10) / 10 : null,
        maxCostPerKg: max !== null ? Math.round(max * 10) / 10 : null,
        sampleSize: samples.length,
        unit: "元/公斤",
        costFiles: costFiles.length > 0 ? costFiles : undefined,
      };
    },
    ["moa-product-cost-insight-v2", cropName],
    { revalidate: 21600 },
  );

  try {
    const insight = await cachedFn();
    return { insight };
  } catch (error) {
    return {
      insight: null,
      error: error instanceof Error ? error.message : "Unknown MOA fetch error",
    };
  }
}

interface OpenDataRecord {
  交易日期: string;
  種類代碼: string;
  作物代號: string;
  作物名稱: string;
  市場代號: string;
  市場名稱: string;
  上價: number;
  中價: number;
  下價: number;
  平均價: number;
  交易量: number;
}


// Seafood feed implementations live in seafoodFeed.ts (re-exported at bottom).


async function fetchRecentOpenDataUncached(): Promise<
  (NormalizedPriceRecord & { _typeCode?: string })[]
> {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "data",
      "latest-opendata.json",
    );
    const content = await fs.promises.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);

    if (parsed.metadata && parsed.metadata.lastUpdated) {
      const lastUpdatedDate = parsed.metadata.lastUpdated.split("T")[0];
      const today = todayISO();

      if (lastUpdatedDate >= subtractDays(today, 3)) {
        console.log("Using local JSON data:", lastUpdatedDate);
        return parsed.data.map((d: LocalDailyRecord) => ({
          cropCode: d.CropCode ?? "",
          cropName: d.CropName ?? "",
          marketName: d.MarketName ?? "",
          grade: "一般",
          upperPrice: Number(d.Upper_Price) || 0,
          middlePrice: Number(d.Middle_Price) || 0,
          lowerPrice: Number(d.Lower_Price) || 0,
          avgPrice: Number(d.Avg_Price) || 0,
          transWeight: Number(d.Trans_Quantity) || 0,
          date: rocToISO(d.TransDate ?? ""),
          _typeCode: d.TcType,
        }));
      } else {
        console.log(
          `Local JSON is old (${lastUpdatedDate}), falling back to live API`,
        );
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(
        "Failed to read local latest-opendata.json:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const url =
    "https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx";
  const timeoutMs = process.env.MOA_FETCH_TIMEOUT_MS
    ? parseInt(process.env.MOA_FETCH_TIMEOUT_MS, 10)
    : 25000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Connection: "close",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`OpenData HTTP ${res.status}`);
    const text = await res.text();
    try {
      const data = JSON.parse(text) as OpenDataRecord[];
      return data.map((d) => ({
        cropCode: d.作物代號 ?? "",
        cropName: d.作物名稱 ?? "",
        marketName: d.市場名稱 ?? "",
        grade: "一般",
        upperPrice: d.上價 || 0,
        middlePrice: d.中價 || 0,
        lowerPrice: d.下價 || 0,
        avgPrice: d.平均價 || 0,
        transWeight: d.交易量 || 0,
        date: rocToISO(d.交易日期 ?? ""),
        _typeCode: d.種類代碼,
      }));
    } catch (parseError) {
      throw new Error(`OpenData Parse Error`);
    }
  } finally {
    clearTimeout(timer);
  }
}

// The recent OpenData feed (~7000 records, ~1.4MB) is the shared baseline source for
// movers, the search list and cross-market compare. The upstream live fetch is slow
// (~15-19s), so memoize it across requests — without this, every one of those
// endpoints re-pays the full fetch on each call. Data refreshes daily, so a 30-min
// TTL is safe and cuts warm latency from ~18s to sub-second.
const cachedRecentOpenData = unstable_cache(
  fetchRecentOpenDataUncached,
  ["moa-recent-opendata"],
  { revalidate: 1800, tags: ["moa-recent-opendata"] },
);

export async function fetchRecentOpenData(): Promise<
  (NormalizedPriceRecord & { _typeCode?: string })[]
> {
  return cachedRecentOpenData();
}

/**
 * Resolve a crop's display category using the MOA 種類代碼 (N04/N05/N06) from recent
 * data, which is authoritative — many flower names carry no flower keyword (康乃馨,
 * 洋桔梗…) and some fruits/vegetables match the wrong keyword, so name-only guessing
 * misclassifies them. Crops absent from the produce feed (meat/seafood) fall back to
 * name-based classification. See getProduceCategory.
 */
export async function resolveCropCategory(
  cropName: string,
): Promise<ProduceCategory> {
  try {
    const records = await fetchRecentOpenData();
    const match = records.find((r) => r.cropName === cropName);
    if (match?._typeCode) {
      return getProduceCategory(cropName, match._typeCode);
    }
  } catch {
    // fall through to name-only classification
  }
  return getProduceCategory(cropName);
}

/**
 * Distinct flower (N06) crop names from recent data, most-traded first. Used by the
 * flower category hub, which can't rely on the static COMMON_CROPS list (it holds only
 * a few flower names) — real flower products are data-driven and change over time.
 */
export async function fetchFlowerCropNames(): Promise<string[]> {
  try {
    const records = await fetchRecentOpenData();
    const volume = new Map<string, number>();
    for (const r of records) {
      if (r._typeCode !== CROP_TYPE_FLOWER || !r.cropName) continue;
      volume.set(r.cropName, (volume.get(r.cropName) ?? 0) + (r.transWeight || 0));
    }
    return [...volume.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  } catch {
    return [];
  }
}

export async function fetchPriceRecords(
  options: PriceQueryOptions,
): Promise<{ records: NormalizedPriceRecord[]; error?: string }> {
  const date = options.date ?? todayISO();
  const startDate = options.startDate ?? date;
  const endDate = options.endDate ?? date;

  // 1. Check if we can satisfy the query completely using our structured daily JSON files.
  // The daily files contain ALL markets and ALL crops.
  // By using this, we bypass the MOA API v1 limit of 1000 records.
  try {
    const dailyRecords = await fetchLocalDailyData(
      startDate,
      endDate,
      options.cropName,
      options.market,
      options.marketType,
    );
    if (dailyRecords && dailyRecords.length > 0) {
      // If we found records in our daily files, return them.
      // We assume if daily files exist for the range, they are complete.
      return { records: dailyRecords };
    }
  } catch (err) {
    console.warn(
      "fetchLocalDailyData failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  // 2. If daily files weren't available or returned empty (maybe dates are from today and not synced yet),
  // fallback to the recent OpenData JSON (covers latest 4~7 days) if applicable.
  const today = todayISO();
  const latestOpenDataDate = subtractDays(today, 5); // buffer
  if (startDate >= latestOpenDataDate) {
    try {
      const allRecordsRaw = await fetchRecentOpenData();
      let filteredData = allRecordsRaw;
      if (options.marketType) {
        if (options.marketType === "Veg")
          filteredData = filteredData.filter(
            (d) => d._typeCode === CROP_TYPE_VEG,
          );
        else if (options.marketType === "Fruit")
          filteredData = filteredData.filter(
            (d) => d._typeCode === CROP_TYPE_FRUIT,
          );
        else if (options.marketType === "Flower")
          filteredData = filteredData.filter(
            (d) => d._typeCode === CROP_TYPE_FLOWER,
          );
      }
      let filtered = filteredData
        .filter((r) => r.date >= startDate && r.date <= endDate)
        .map((r) => {
          const { _typeCode, ...rest } = r;
          return rest;
        });
      if (options.market && options.market !== "全部市場") {
        filtered = filtered.filter((r) => r.marketName === options.market);
      }
      if (options.cropName) {
        filtered = filtered.filter(
          (r) =>
            r.cropName === options.cropName ||
            r.cropName.includes(options.cropName!),
        );
      }
      return { records: filtered };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log(
          `fetchRecentOpenData: timeout (${process.env.MOA_FETCH_TIMEOUT_MS || 10000}ms), falling back to v1`,
        );
      } else {
        console.warn(
          "fetchRecentOpenData failed:",
          error instanceof Error ? error.message : String(error),
        );
      }
      // fallback to v1 API
    }
  }

  // 3. Ultimate Fallback: MOA v1 API requests.
  const params = new URLSearchParams({
    Start_time: isoToROC(startDate),
    End_time: isoToROC(endDate),
  });

  if (options.market && options.market !== "全部市場") {
    params.set("MarketName", options.market);
  }

  if (options.marketType) {
    if (options.marketType === "Veg") {
      params.set("TcType", CROP_TYPE_VEG);
    } else if (options.marketType === "Fruit") {
      params.set("TcType", CROP_TYPE_FRUIT);
    } else if (options.marketType === "Flower") {
      // MOA 的 v1/OpenData 端點不供應花卉；此分支通常取不到資料，
      // 花卉一律由本地 daily 檔（fetchLocalDailyData）供應。
      params.set("TcType", CROP_TYPE_FLOWER);
    }
  }

  if (options.cropName) {
    params.set("CropName", options.cropName);
  }

  try {
    const records = await fetchMOARecords(params);
    return { records: records.map(parseRecord) };
  } catch (error) {
    return {
      records: [],
      error: error instanceof Error ? error.message : "Unknown MOA fetch error",
    };
  }
}

async function fetchLocalDailyData(
  startDate: string,
  endDate: string,
  cropName?: string,
  market?: string,
  marketType?: string,
): Promise<NormalizedPriceRecord[] | null> {
  const dailyDir = path.join(process.cwd(), "public", "data", "daily");

  // We don't check for directory existence to avoid synchronous blocking. If missing, subsequent reads will throw ENOENT.

  const datesToFetch: string[] = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    datesToFetch.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  if (datesToFetch.length === 0) return null;

  let missingAnyFile = false;

  const results = await Promise.all(
    datesToFetch.map(async (isoDate) => {
      const filePath = path.join(dailyDir, `${isoDate}.json`);
      try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        const parsed = JSON.parse(content) as LocalDailyRecord[];
        const records: NormalizedPriceRecord[] = [];

        for (const d of parsed) {
          if (cropName && d.CropName !== cropName) continue;
          if (market && market !== "全部市場" && d.MarketName !== market)
            continue;
          if (marketType) {
            if (marketType === "Veg" && d.TcType !== CROP_TYPE_VEG) continue;
            if (marketType === "Fruit" && d.TcType !== CROP_TYPE_FRUIT)
              continue;
            if (marketType === "Flower" && d.TcType !== CROP_TYPE_FLOWER)
              continue;
          }

          records.push({
            cropCode: d.CropCode ?? "",
            cropName: d.CropName ?? "",
            marketName: d.MarketName ?? "",
            grade: "一般",
            upperPrice: Number(d.Upper_Price) || 0,
            middlePrice: Number(d.Middle_Price) || 0,
            lowerPrice: Number(d.Lower_Price) || 0,
            avgPrice: Number(d.Avg_Price) || 0,
            transWeight: Number(d.Trans_Quantity) || 0,
            date: rocToISO(d.TransDate ?? ""),
          });
        }
        return records;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          // Today's file may not exist yet if the daily job hasn't run yet.
          // Treat a missing today-or-future date as "no data" rather than a full cache miss,
          // so prior-day local files are still used and avoid hitting MOA API unnecessarily.
          if (isoDate < todayISO()) {
            missingAnyFile = true;
          }
        } else {
          console.warn(
            `Failed to read daily file ${isoDate}.json`,
            err instanceof Error ? err.message : String(err),
          );
          missingAnyFile = true;
        }
        return [];
      }
    }),
  );

  if (missingAnyFile) return null; // If a historical file is missing, fallback to API
  return results.flat();
}

export async function fetchMarketWindowRecords(
  market: string,
  startDate: string,
  endDate: string,
  marketType?: string,
): Promise<{ records: NormalizedPriceRecord[]; error?: string }> {
  const result = await fetchPriceRecords({
    market,
    startDate,
    endDate,
    marketType,
  });
  return { records: result.records, error: result.error };
}

function processRawRecordsToResult(
  rawRecords: MOARawRecord[],
  startDate: string,
  endDate: string,
): FetchMarketDataResult {
  if (!rawRecords.length) {
    return {
      data: [],
      closedDays: [],
      error: "查無此作物的交易資料",
    };
  }

  return buildInterpolatedHistory({
    records: rawRecords.map(parseRecord),
    dates: dateRange(startDate, endDate),
    labelForDate: dateLabel,
  });
}

// History local-first source. Serves from the synced daily files (public/data/daily)
// so the heavy 30-day history endpoint avoids the live API on cache misses.
//
// Unlike fetchLocalDailyData (which bails to the API if ANY day's file is missing),
// history MUST tolerate missing days: a 休市 / 公休 / weekend has no daily file by
// design, and a 30-day window almost always contains some — so a strict reader would
// never use local. Missing days are simply left out; buildInterpolatedHistory marks
// them isClosed (休市), which is exactly the desired behavior.
//
// Falls back to the v1 API (returns null) only when local can't be trusted:
//   - no file within the last 5 days of the range  → sync likely stale, API may be fresher
//   - zero records for the crop                     → e.g. name/alias mismatch, let v1 try
async function historyFromLocalDaily(
  cropName: string,
  market: string,
  startDate: string,
  endDate: string,
): Promise<FetchMarketDataResult | null> {
  try {
    const dailyDir = path.join(process.cwd(), "public", "data", "daily");
    const dates = dateRange(startDate, endDate);
    const records: NormalizedPriceRecord[] = [];
    let newestFile = "";

    await Promise.all(
      dates.map(async (iso) => {
        try {
          const content = await fs.promises.readFile(
            path.join(dailyDir, `${iso}.json`),
            "utf-8",
          );
          const parsed = JSON.parse(content) as LocalDailyRecord[];
          if (iso > newestFile) newestFile = iso;
          for (const d of parsed) {
            if (d.CropName !== cropName) continue;
            if (market && market !== "全部市場" && d.MarketName !== market)
              continue;
            records.push({
              cropCode: d.CropCode ?? "",
              cropName: d.CropName ?? "",
              marketName: d.MarketName ?? "",
              grade: "一般",
              upperPrice: Number(d.Upper_Price) || 0,
              middlePrice: Number(d.Middle_Price) || 0,
              lowerPrice: Number(d.Lower_Price) || 0,
              avgPrice: Number(d.Avg_Price) || 0,
              transWeight: Number(d.Trans_Quantity) || 0,
              date: rocToISO(d.TransDate ?? ""),
            });
          }
        } catch {
          // Missing file: 休市/未營業 or not-yet-synced — tolerate, leave the day out.
        }
      }),
    );

    // Trust local only when sync looks alive and the crop actually has local rows.
    const syncAlive = newestFile !== "" && newestFile >= subtractDays(endDate, 5);
    if (!syncAlive || records.length === 0) return null;

    return buildInterpolatedHistory({
      records,
      dates,
      labelForDate: dateLabel,
    });
  } catch {
    return null; // fall through to the live API path
  }
}

export async function fetchLocalMarketDataByDates(
  cropName: string,
  market: string,
  startDate: string,
  endDate: string,
): Promise<FetchMarketDataResult> {
  const localResult = await historyFromLocalDaily(cropName, market, startDate, endDate)
  if (localResult) return localResult

  return {
    data: [],
    closedDays: [],
    error: '靜態行情資料尚未同步',
  }
}

export async function fetchMarketData(
  cropName: string,
  market: string,
  period: string,
): Promise<FetchMarketDataResult> {
  const endDate = todayISO();
  const startDate = subtractDays(endDate, periodToDays(period));

  const cachedFn = unstable_cache(
    async (): Promise<FetchMarketDataResult> => {
      const localResult = await historyFromLocalDaily(
        cropName,
        market,
        startDate,
        endDate,
      );
      if (localResult) return localResult;

      const params = new URLSearchParams({
        Start_time: isoToROC(startDate),
        End_time: isoToROC(endDate),
        CropName: cropName,
      });

      if (market && market !== "全部市場") {
        params.set("MarketName", market);
      }

      let rawRecords: MOARawRecord[];

      try {
        rawRecords = await fetchMOARecords(params);
      } catch (error) {
        return {
          data: [],
          closedDays: [],
          error:
            error instanceof Error ? error.message : "Unknown MOA fetch error",
        };
      }

      return processRawRecordsToResult(rawRecords, startDate, endDate);
    },
    ["moa-market-data-v1", cropName, market, period, endDate],
    { revalidate: 120, tags: [`history-${cropName}`] },
  );

  return cachedFn();
}

export async function fetchMarketDataByDates(
  cropName: string,
  market: string,
  startDate: string,
  endDate: string,
): Promise<FetchMarketDataResult> {
  const cachedFn = unstable_cache(
    async (): Promise<FetchMarketDataResult> => {
      const localResult = await historyFromLocalDaily(
        cropName,
        market,
        startDate,
        endDate,
      );
      if (localResult) return localResult;

      const params = new URLSearchParams({
        Start_time: isoToROC(startDate),
        End_time: isoToROC(endDate),
        CropName: cropName,
      });

      if (market && market !== "全部市場") {
        params.set("MarketName", market);
      }

      let rawRecords: MOARawRecord[];

      try {
        rawRecords = await fetchMOARecords(params);
      } catch (error) {
        return {
          data: [],
          closedDays: [],
          error:
            error instanceof Error ? error.message : "Unknown MOA fetch error",
        };
      }

      return processRawRecordsToResult(rawRecords, startDate, endDate);
    },
    ["moa-market-data-range-v1", cropName, market, startDate, endDate],
    { revalidate: 120, tags: [`history-${cropName}`] },
  );

  return cachedFn();
}

// Bulk source for fetchSearchRecords. The MOA v1 API caps responses at 1000
// records, so a broad (multi-crop) multi-day query returns only the most recent
// day — leaving no previous-day baseline and collapsing every priceChange to 0.
// For recent windows we prefer the uncapped OpenData feed (same source the movers
// endpoint uses), which returns the last few trading days in full. Falls back to
// the capped path when OpenData is unavailable or doesn't cover the window.
async function fetchSearchBulkRecords(
  options: PriceQueryOptions,
): Promise<{ records: NormalizedPriceRecord[]; error?: string }> {
  const endDate = options.endDate ?? options.date ?? todayISO();
  const startDate = options.startDate ?? endDate;
  const latestOpenDataDate = subtractDays(todayISO(), 5);

  if (endDate >= latestOpenDataDate) {
    try {
      const recent = await fetchRecentOpenData();
      let filtered = recent.filter(
        (r) => r.date >= startDate && r.date <= endDate,
      );
      if (options.marketType === "Veg") {
        filtered = filtered.filter((r) => r._typeCode === CROP_TYPE_VEG);
      } else if (options.marketType === "Fruit") {
        filtered = filtered.filter((r) => r._typeCode === CROP_TYPE_FRUIT);
      } else if (options.marketType === "Flower") {
        filtered = filtered.filter((r) => r._typeCode === CROP_TYPE_FLOWER);
      }
      if (options.market && options.market !== "全部市場") {
        filtered = filtered.filter((r) => r.marketName === options.market);
      }
      if (options.cropName) {
        filtered = filtered.filter(
          (r) =>
            r.cropName === options.cropName ||
            r.cropName.includes(options.cropName!),
        );
      }
      // Need at least two distinct trading days for a real baseline; otherwise
      // fall through to the v1 path which may reach further back.
      const distinctDates = new Set(filtered.map((r) => r.date));
      if (filtered.length > 0 && distinctDates.size > 1) {
        return { records: filtered.map(({ _typeCode, ...rest }) => rest) };
      }
    } catch {
      // fall through to the capped v1 path
    }
  }

  return fetchPriceRecords(options);
}

export async function fetchSearchRecords(
  options: PriceQueryOptions,
): Promise<SearchRecordsResult> {
  const endDate = options.endDate ?? options.date ?? todayISO();
  const startDate = options.startDate ?? endDate;
  // Look back 7 days to find the real previous trading day (handles holidays/weekends)
  const previousDate = subtractDays(startDate, 7);

  if (options.marketType === "meat") {
    try {
      const localFile = path.join(
        process.cwd(),
        "public",
        "data",
        "latest-livestock.json",
      );
      const fileContent = await fs.promises.readFile(localFile, "utf-8");
      const parsed = JSON.parse(fileContent);
      const data: LivestockLocalData = parsed.data || {};

      const isCompareAll = !options.market || options.market === "全部市場";
      let records: NormalizedPriceRecord[] = [];

      if (isCompareAll) {
        const livestock = await fetchLivestockPrices();
        if (livestock.porkAvgPrice !== null && livestock.porkAvgPrice > 0) {
          records.push({
            cropCode: "M01",
            cropName: "毛豬",
            marketName: "全國平均",
            grade: "中平",
            upperPrice: livestock.porkAvgPrice || 0,
            middlePrice: livestock.porkAvgPrice || 0,
            lowerPrice: livestock.porkAvgPrice || 0,
            avgPrice: livestock.porkAvgPrice || 0,
            transWeight: 1000,
            date: livestock.date || todayISO(),
          });
        }
        if (data.pork) {
          for (const p of data.pork) {
            records.push({
              cropCode: "M01",
              cropName: "毛豬",
              marketName: p.MarketName,
              grade: "中平",
              upperPrice: Number(p.TransNum_AvgPrice) || 0,
              middlePrice: Number(p.TransNum_AvgPrice) || 0,
              lowerPrice: Number(p.TransNum_AvgPrice) || 0,
              avgPrice: Number(p.TransNum_AvgPrice) || 0,
              transWeight: Number(p.TransNum_Total) || 0,
              date: p.TransDate ? rocToISO(p.TransDate) : todayISO(),
            });
          }
        }
        if (data.sheep) {
          for (const s of data.sheep) {
            records.push({
              cropCode: "M01",
              cropName: "羊",
              marketName: s.name || s.shortName || "",
              grade: "中平",
              upperPrice: parseFloat(String(s.avgPrice)) || 0,
              middlePrice: parseFloat(String(s.avgPrice)) || 0,
              lowerPrice: parseFloat(String(s.avgPrice)) || 0,
              avgPrice: parseFloat(String(s.avgPrice)) || 0,
              transWeight: parseFloat(String(s.quantity)) || 0,
              date: s.transDate ? s.transDate.replace(/\//g, "-") : todayISO(),
            });
          }
        }
        if (data.red_feather && data.red_feather.length > 0) {
          const rfRegions = [
            { name: "北部", m: "RedFeather_N_M", f: "RedFeather_N_F" },
            { name: "中部", m: "RedFeather_C_M", f: "RedFeather_C_F" },
            { name: "南部", m: "RedFeather_S_M", f: "RedFeather_S_F" },
          ] as const;
          for (const row of data.red_feather) {
            const isoDate = row.TransDate.replace(/\//g, "-");
            for (const region of rfRegions) {
              const mPrice = safeNumericField(
                row as Record<string, unknown>,
                region.m,
              );
              const fPrice = safeNumericField(
                row as Record<string, unknown>,
                region.f,
              );
              if (mPrice === null && fPrice === null) continue;
              const count =
                (mPrice !== null ? 1 : 0) + (fPrice !== null ? 1 : 0);
              const avg = ((mPrice ?? 0) + (fPrice ?? 0)) / count;
              records.push({
                cropCode: "M02",
                cropName: "紅羽土雞",
                marketName: region.name,
                grade: "中平",
                upperPrice: avg,
                middlePrice: avg,
                lowerPrice: avg,
                avgPrice: avg,
                transWeight: 100,
                date: isoDate,
              });
            }
          }
        }
      } else {
        const targetMarket = options.market;
        if (targetMarket === "全國平均") {
          const livestock = await fetchLivestockPrices();
          records = [
            { name: "毛豬", price: livestock.porkAvgPrice, weight: 1000 },
            { name: "白肉雞", price: livestock.chickenPrice, weight: 500 },
            {
              name: "紅羽土雞",
              price: livestock.redFeatherChickenPrice,
              weight: 400,
            },
            { name: "肉鵝", price: livestock.goosePrice, weight: 300 },
            { name: "肉鴨", price: livestock.duckPrice, weight: 300 },
            { name: "羊", price: livestock.sheepAvgPrice, weight: 200 },
            { name: "雞蛋", price: livestock.eggPrice, weight: 10000 },
          ]
            .map((item) => ({
              cropCode: "M01",
              cropName: item.name,
              marketName: "全國平均",
              grade: "中平",
              upperPrice: item.price || 0,
              middlePrice: item.price || 0,
              lowerPrice: item.price || 0,
              avgPrice: item.price || 0,
              transWeight: item.weight,
              date: livestock.date,
            }))
            .filter((m) => m.avgPrice > 0);
        } else {
          // Find specific market in pork or sheep
          if (data.pork) {
            const porkMatches = (data.pork ?? []).filter(
              (p) => p.MarketName === targetMarket,
            );
            if (porkMatches.length > 0) {
              const p = porkMatches[0];
              records.push({
                cropCode: "M01",
                cropName: "毛豬",
                marketName: p.MarketName,
                grade: "中平",
                upperPrice: Number(p.TransNum_AvgPrice) || 0,
                middlePrice: Number(p.TransNum_AvgPrice) || 0,
                lowerPrice: Number(p.TransNum_AvgPrice) || 0,
                avgPrice: Number(p.TransNum_AvgPrice) || 0,
                transWeight: Number(p.TransNum_Total) || 0,
                date: p.TransDate ? rocToISO(p.TransDate) : todayISO(),
              });
            }
          }
          if (data.sheep) {
            const sheepMatches = data.sheep.filter(
              (s) => s.name === targetMarket || s.shortName === targetMarket,
            );
            if (sheepMatches.length > 0) {
              const qs = sheepMatches.reduce(
                (acc: number, s) => acc + (parseFloat(String(s.quantity)) || 0),
                0,
              );
              const totalV = sheepMatches.reduce(
                (acc: number, s) =>
                  acc +
                  (parseFloat(String(s.avgPrice)) || 0) *
                    (parseFloat(String(s.quantity)) || 0),
                0,
              );
              records.push({
                cropCode: "M01",
                cropName: "羊",
                marketName: targetMarket ?? "",
                grade: "中平",
                upperPrice: totalV / (qs || 1),
                middlePrice: totalV / (qs || 1),
                lowerPrice: totalV / (qs || 1),
                avgPrice: totalV / (qs || 1),
                transWeight: qs,
                date: todayISO(),
              });
            }
          }
        }
      }

      const filtered = records.filter(
        (r) => !options.cropName || r.cropName.includes(options.cropName),
      );
      return { records: filtered };
    } catch (e) {
      return { records: [], error: "查無資料" };
    }
  }

  if (options.marketType === "seafood") {
    try {
      const localFile = path.join(
        process.cwd(),
        "public",
        "data",
        "latest-seafood.json",
      );
      const fileContent = await fs.promises.readFile(localFile, "utf-8");
      const parsed = JSON.parse(fileContent);
      let records: NormalizedPriceRecord[] = (parsed.data || [])
        .map(
          (r: SeafoodRawRecord) =>
            ({
              cropCode: String(r["品種代碼"] ?? ""),
              cropName: String(r["魚貨名稱"] ?? ""),
              marketName: String(r["市場名稱"] ?? ""),
              grade: "中平",
              upperPrice: Number(r["上價"] ?? r["平均價"]) || 0,
              middlePrice: Number(r["中價"] ?? r["平均價"]) || 0,
              lowerPrice: Number(r["下價"] ?? r["平均價"]) || 0,
              avgPrice: Number(r["平均價"]) || 0,
              transWeight: Number(r["交易量"]) || 0,
              date: todayISO(),
            }) as NormalizedPriceRecord,
        )
        .filter((m: NormalizedPriceRecord) => m.avgPrice > 0);
      if (options.cropName)
        records = records.filter((r) => r.cropName.includes(options.cropName!));
      if (options.market && options.market !== "全部市場")
        records = records.filter((r) => r.marketName === options.market);
      return { records };
    } catch {
      return { records: [], error: "查無資料" };
    }
  }

  // Make a single bulk request instead of N+1 requests
  const bulkRes = await fetchSearchBulkRecords({
    cropName: options.cropName,
    market: options.market,
    startDate: previousDate,
    endDate: endDate,
    marketType: options.marketType,
  });

  if (bulkRes.error) {
    return { records: [], error: bulkRes.error };
  }

  if (bulkRes.records.length === 0) {
    return { records: [] };
  }

  // Per crop+market: full priced-day series from bulk (includes look-back).
  // Latest priced day vs previous priced day; price alone qualifies (no min volume).
  type DayAgg = {
    avgPriceSum: number;
    volSum: number;
    priceCount: number;
    upperPrice: number;
    middlePrice: number;
    lowerPrice: number;
    transWeight: number;
  };
  type SeriesState = {
    cropCode: string;
    cropName: string;
    marketName: string;
    byDate: Map<string, DayAgg>;
  };

  const seriesByKey = new Map<string, SeriesState>();

  for (const record of bulkRes.records) {
    if (!record.date || !(record.avgPrice > 0)) continue;
    const key = `${record.cropCode}_${record.marketName}`;
    let state = seriesByKey.get(key);
    if (!state) {
      state = {
        cropCode: record.cropCode,
        cropName: record.cropName,
        marketName: record.marketName,
        byDate: new Map(),
      };
      seriesByKey.set(key, state);
    }
    const day = state.byDate.get(record.date) ?? {
      avgPriceSum: 0,
      volSum: 0,
      priceCount: 0,
      upperPrice: record.upperPrice,
      middlePrice: record.middlePrice,
      lowerPrice: record.lowerPrice,
      transWeight: 0,
    };
    day.avgPriceSum += record.avgPrice;
    day.priceCount += 1;
    day.volSum += record.transWeight || 0;
    day.transWeight += record.transWeight || 0;
    day.upperPrice = Math.max(day.upperPrice, record.upperPrice);
    day.lowerPrice = Math.min(day.lowerPrice, record.lowerPrice);
    day.middlePrice = record.middlePrice;
    state.byDate.set(record.date, day);
  }

  const searchRecords: ProducePrice[] = [];

  for (const state of seriesByKey.values()) {
    const dated = [...state.byDate.entries()]
      .map(([date, day]) => {
        // Prefer volume-weighted if volumes exist; else simple mean of quotes.
        const price =
          day.volSum > 0 && day.priceCount > 0
            ? // re-weight: we only stored sum of avgs — use simple mean of row avgs
              day.avgPriceSum / day.priceCount
            : day.priceCount > 0
              ? day.avgPriceSum / day.priceCount
              : 0;
        return { date, price, day };
      })
      .filter((d) => d.price > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (dated.length === 0) continue;

    const latest = dated[dated.length - 1];
    const previous = dated.length > 1 ? dated[dated.length - 2] : null;
    const priceChange =
      previous && previous.price > 0
        ? ((latest.price - previous.price) / previous.price) * 100
        : 0;

    searchRecords.push({
      cropCode: state.cropCode,
      cropName: state.cropName,
      marketName: state.marketName,
      upperPrice: Math.round(latest.day.upperPrice * 10) / 10,
      middlePrice: Math.round(latest.day.middlePrice * 10) / 10,
      lowerPrice: Math.round(latest.day.lowerPrice * 10) / 10,
      avgPrice: Math.round(latest.price * 10) / 10,
      transWeight: Math.round(latest.day.transWeight),
      date: latest.date,
      priceChange: Math.round(priceChange * 10) / 10,
    });
  }

  searchRecords.sort((left, right) =>
    left.cropName.localeCompare(right.cropName, "zh-TW"),
  );

  return { records: searchRecords };
}

function aggregateMarketByDate(
  records: NormalizedPriceRecord[],
): Map<string, MarketDailyAggregate> {
  const grouped = new Map<string, MarketDailyAggregate>();

  for (const record of records) {
    if (!record.date) continue;

    const current = grouped.get(record.date) ?? {
      priceSum: 0,
      priceCount: 0,
      volumeSum: 0,
      recordCount: 0,
    };

    if (record.avgPrice > 0) {
      current.priceSum += record.avgPrice;
      current.priceCount += 1;
    }

    current.volumeSum += record.transWeight;
    current.recordCount += 1;
    grouped.set(record.date, current);
  }

  return grouped;
}

export async function fetchMarketOverviewTrend(
  market: string,
  days: number,
  endDate: string = todayISO(),
  /** Veg | Fruit — when set, only that crop type is aggregated into the market average. */
  marketType?: string,
): Promise<MarketOverviewTrendResult> {
  const normalizedDays = Math.min(Math.max(Math.floor(days), 1), 30);
  const typeKey = marketType || "all";

  const cachedFn = unstable_cache(
    async (): Promise<{ points: MarketOverviewTrendPoint[] }> => {
      const startDate = subtractDays(endDate, Math.max(normalizedDays - 1, 0));
      const bulkRes = await fetchMarketWindowRecords(
        market,
        startDate,
        endDate,
        marketType,
      );

      if (bulkRes.error) {
        throw new Error(bulkRes.error);
      }

      if (bulkRes.records.length === 0) {
        return { points: [] };
      }

      const grouped = aggregateMarketByDate(bulkRes.records);

      const valuesByDate = new Map<string, MarketOverviewTrendValue>();
      for (const date of dateRange(startDate, endDate)) {
        const current = grouped.get(date);
        if (!current || current.recordCount === 0) {
          continue;
        }

        valuesByDate.set(date, {
          avgPrice:
            current.priceCount > 0
              ? Math.round((current.priceSum / current.priceCount) * 10) / 10
              : null,
          volume: Math.round(current.volumeSum),
        });
      }

      const points = buildMarketOverviewTrendPoints(
        dateRange(startDate, endDate),
        valuesByDate,
        dateLabel,
      );

      return { points };
    },
    [
      "moa-market-overview-trend-v3",
      market,
      String(normalizedDays),
      endDate,
      typeKey,
    ],
    { revalidate: 120 },
  );

  try {
    const res = await cachedFn();
    if (res.points.length === 0) {
      return { points: [], error: "查無市場趨勢資料" };
    }
    return { points: res.points };
  } catch (error) {
    return {
      points: [],
      error: error instanceof Error ? error.message : "Unknown MOA fetch error",
    };
  }
}




// Livestock feed implementations live in livestockFeed.ts (re-exported at bottom).


// Returns the top-3 crops by total trading volume over the last 7 days.
// Uses a 5-page cap (vs global MAX_PAGES=50) to stay within Vercel function budgets.
export async function fetchSeasonalCrops(): Promise<{
  crops: SeasonalItem[];
  error?: string;
}> {
  const dateKey = todayISO();

  const cachedFn = unstable_cache(
    async (): Promise<{ crops: SeasonalItem[] }> => {
      const endDate = dateKey;
      const startDate = subtractDays(endDate, 7);
      const params = new URLSearchParams({
        Start_time: isoToROC(startDate),
        End_time: isoToROC(endDate),
      });

      let rawRecords: MOARawRecord[];
      try {
        rawRecords = await fetchMOARecords(params, 5);
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "MOA fetch error",
        );
      }

      if (rawRecords.length === 0) return { crops: [] };

      const volumeMap = new Map<string, number>();
      for (const raw of rawRecords) {
        const record = parseRecord(raw);
        if (!record.cropName || record.transWeight <= 0) continue;
        volumeMap.set(
          record.cropName,
          (volumeMap.get(record.cropName) ?? 0) + record.transWeight,
        );
      }

      const crops = [...volumeMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cropName]) => {
          const desc = CROP_DESCRIPTIONS[cropName];
          return {
            cropName,
            emoji: getCropEmoji(cropName),
            category: getProduceCategory(cropName),
            reason: desc?.reason ?? "近期交易量排行",
            note: desc?.note ?? `${cropName}近期交易活躍，可留意行情動態。`,
          };
        });

      return { crops };
    },
    ["moa-seasonal-crops-v2", dateKey],
    { revalidate: 1800 },
  );

  try {
    return await cachedFn();
  } catch (error) {
    return {
      crops: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Re-export feed modules for stable import paths (@/lib/server/moa).
export {
  fetchLatestSeafoodData,
  fetchSeafoodMarketDailySummaries,
  fetchSeafoodMarketOverview,
  fetchSeafoodMarketTrend,
  type SeafoodMarketDaySummary,
  type SeafoodRawRecord,
} from "@/lib/server/seafoodFeed";
export {
  fetchLivestockPrices,
  fetchLivestockPorkTrend,
  type LivestockLocalData,
} from "@/lib/server/livestockFeed";
