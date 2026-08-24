/**
 * Pure feed → dated-quote builders for 漁產 / 畜產 search — no I/O, safe for
 * node:test without path aliases.
 *
 * Both snapshots carry ~1–3 months of history, and both used to be poured into
 * search results unfiltered with the date stamped as "today". These builders
 * keep each row's real 交易日期 so aggregateSearchRecords can filter by the
 * requested window and compute a real 漲跌幅.
 *
 * Date formats differ per table and none of them may be assumed: 毛豬/漁產 quote
 * compact ROC (1150822), while 羊/家禽 quote AD with slashes (2026/08/20) —
 * feeding the latter to rocToISO would land in the year 3937. normalizeMoaDate
 * is the only safe entry point.
 */
import { normalizeMoaDate } from "./dateUtils.ts";
import type { DatedQuote } from "./searchAggregation.ts";

const NATIONWIDE_MARKET = "全國平均";

/**
 * Distinct code per livestock item. aggregateSearchRecords keys series by
 * 品種代碼＋市場, so sharing one code across items would silently merge 毛豬
 * with 羊 at the same market.
 */
export const LIVESTOCK_CROP_CODES = {
  pork: "M01",
  sheep: "M02",
  redFeather: "M03",
  broiler: "M04",
  egg: "M05",
  goose: "M06",
  duck: "M07",
} as const;

/** Shape of one row in public/data/latest-seafood.json. */
export type SeafoodQuoteRow = {
  交易日期?: string | number;
  品種代碼?: string | number;
  魚貨名稱?: string;
  市場名稱?: string;
  上價?: number | string;
  中價?: number | string;
  下價?: number | string;
  平均價?: number | string;
  交易量?: number | string;
};

type DateKeyedRow = Record<string, unknown> & { TransDate?: string };

type PorkRow = {
  TransDate?: string;
  MarketName?: string;
  TransNum_Total?: number | string;
  TransNum_AvgPrice?: number | string;
};

type SheepRow = {
  transDate?: string;
  name?: string;
  shortName?: string;
  avgPrice?: string | number;
  quantity?: string | number;
};

/** Shape of the `data` object in public/data/latest-livestock.json. */
export type LivestockFeedTables = {
  egg_chicken?: DateKeyedRow[];
  pork?: PorkRow[];
  red_feather?: DateKeyedRow[];
  goose_duck?: DateKeyedRow[];
  sheep?: SheepRow[];
};

/** Parse a feed value that may be blank, non-numeric ("休市"), or already a number. */
function num(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNum(row: DateKeyedRow, ...keys: string[]): number | null {
  for (const key of keys) {
    const parsed = num(row[key]);
    if (parsed !== null) return parsed;
  }
  return null;
}

/** A single quoted price with no upper/lower band, the usual shape for 畜產. */
function flatQuote(
  cropCode: string,
  cropName: string,
  marketName: string,
  date: string,
  price: number,
  transWeight: number,
): DatedQuote {
  return {
    cropCode,
    cropName,
    marketName,
    grade: "中平",
    upperPrice: price,
    middlePrice: price,
    lowerPrice: price,
    avgPrice: price,
    transWeight,
    date,
  };
}

export function buildSeafoodQuotes(
  rows: readonly SeafoodQuoteRow[],
): DatedQuote[] {
  const quotes: DatedQuote[] = [];

  for (const row of rows) {
    const date = normalizeMoaDate(String(row.交易日期 ?? ""));
    const avgPrice = num(row.平均價);
    if (!date || avgPrice === null || avgPrice <= 0) continue;

    quotes.push({
      cropCode: String(row.品種代碼 ?? ""),
      cropName: String(row.魚貨名稱 ?? ""),
      marketName: String(row.市場名稱 ?? ""),
      grade: "中平",
      upperPrice: num(row.上價) ?? avgPrice,
      middlePrice: num(row.中價) ?? avgPrice,
      lowerPrice: num(row.下價) ?? avgPrice,
      avgPrice,
      transWeight: num(row.交易量) ?? 0,
      date,
    });
  }

  return quotes;
}

const RED_FEATHER_REGIONS = [
  { market: "北部", male: "RedFeather_N_M", female: "RedFeather_N_F" },
  { market: "中部", male: "RedFeather_C_M", female: "RedFeather_C_F" },
  { market: "南部", male: "RedFeather_S_M", female: "RedFeather_S_F" },
] as const;

/**
 * Expand every livestock table into dated quotes. National figures are emitted
 * per day as their own 全國平均 market rather than pulled from the homepage's
 * latest-only aggregate, so a 畜產 search honours the requested date like every
 * other market does.
 */
export function buildLivestockQuotes(
  tables: LivestockFeedTables,
): DatedQuote[] {
  const quotes: DatedQuote[] = [];
  const codes = LIVESTOCK_CROP_CODES;

  // 毛豬 全國平均 is volume-weighted upstream (weightedPorkAvg) — 19 markets of
  // very different sizes, and a simple mean lands ~2% above it. Weight it here
  // rather than letting the aggregator average the per-market quotes.
  const porkNational = new Map<string, { priceVolume: number; volume: number }>();

  for (const row of tables.pork ?? []) {
    const date = normalizeMoaDate(String(row.TransDate ?? ""));
    const price = num(row.TransNum_AvgPrice);
    const marketName = String(row.MarketName ?? "");
    if (!date || price === null || price <= 0 || !marketName) continue;
    const volume = num(row.TransNum_Total) ?? 0;

    quotes.push(flatQuote(codes.pork, "毛豬", marketName, date, price, volume));

    const national = porkNational.get(date) ?? { priceVolume: 0, volume: 0 };
    national.priceVolume += price * volume;
    national.volume += volume;
    porkNational.set(date, national);
  }

  for (const [date, national] of porkNational) {
    if (national.volume <= 0) continue;
    quotes.push(
      flatQuote(
        codes.pork,
        "毛豬",
        NATIONWIDE_MARKET,
        date,
        national.priceVolume / national.volume,
        national.volume,
      ),
    );
  }

  for (const row of tables.sheep ?? []) {
    const date = normalizeMoaDate(String(row.transDate ?? ""));
    const price = num(row.avgPrice);
    const marketName = String(row.name ?? row.shortName ?? "");
    if (!date || price === null || price <= 0 || !marketName) continue;
    const volume = num(row.quantity) ?? 0;

    quotes.push(flatQuote(codes.sheep, "羊", marketName, date, price, volume));
    quotes.push(
      flatQuote(codes.sheep, "羊", NATIONWIDE_MARKET, date, price, volume),
    );
  }

  for (const row of tables.red_feather ?? []) {
    const date = normalizeMoaDate(String(row.TransDate ?? ""));
    if (!date) continue;

    for (const region of RED_FEATHER_REGIONS) {
      const male = num(row[region.male]);
      const female = num(row[region.female]);
      const quoted = [male, female].filter((v): v is number => v !== null);
      if (quoted.length === 0) continue;
      const price = quoted.reduce((sum, v) => sum + v, 0) / quoted.length;
      if (price <= 0) continue;

      quotes.push(
        flatQuote(codes.redFeather, "紅羽土雞", region.market, date, price, 0),
      );
      quotes.push(
        flatQuote(
          codes.redFeather,
          "紅羽土雞",
          NATIONWIDE_MARKET,
          date,
          price,
          0,
        ),
      );
    }
  }

  for (const row of tables.egg_chicken ?? []) {
    const date = normalizeMoaDate(String(row.TransDate ?? ""));
    if (!date) continue;

    const broiler = firstNum(
      row,
      "TaijinPrice_2.0kgup",
      "TaijinPrice_1.75kg_1.95kg",
      "Store_KP_TaijinPrice",
    );
    if (broiler !== null && broiler > 0) {
      quotes.push(
        flatQuote(
          codes.broiler,
          "白肉雞",
          NATIONWIDE_MARKET,
          date,
          broiler,
          0,
        ),
      );
    }

    const egg = firstNum(row, "egg_Price", "egg_Producer_Price");
    if (egg !== null && egg > 0) {
      quotes.push(
        flatQuote(codes.egg, "雞蛋", NATIONWIDE_MARKET, date, egg, 0),
      );
    }
  }

  for (const row of tables.goose_duck ?? []) {
    const date = normalizeMoaDate(String(row.TransDate ?? ""));
    if (!date) continue;

    const goose = firstNum(row, "Goose_WR_TaijinPrice");
    if (goose !== null && goose > 0) {
      quotes.push(
        flatQuote(codes.goose, "肉鵝", NATIONWIDE_MARKET, date, goose, 0),
      );
    }

    const duck = firstNum(
      row,
      "Duck_75D_TaijinPrice",
      "Duck_M_TaijinPrice",
    );
    if (duck !== null && duck > 0) {
      quotes.push(
        flatQuote(codes.duck, "肉鴨", NATIONWIDE_MARKET, date, duck, 0),
      );
    }
  }

  return quotes;
}
