/**
 * Pure helpers: national unit price per crop per day, and % change
 * between a crop's latest *reliable* priced day and its previous one.
 *
 * "有價即可" still holds for recording a quote, but a day only enters the
 * movers comparison when national liquidity is above a soft floor — otherwise
 * a 10–30kg thin trade becomes a false baseline and produces +300% noise.
 */

export type PricedTradeRow = {
  cropName: string;
  cropCode?: string;
  date: string; // ISO preferred
  avgPrice: number;
  volume?: number;
};

export type DayPoint = {
  date: string;
  /** Unit price in source units (usually 元/公斤) */
  price: number;
  /** National total volume that day (0 if unknown) */
  volume: number;
  /** Distinct market rows with a price */
  marketCount: number;
};

export type SeriesOptions = {
  /** Min national volume for a day to count in movers comparison */
  minDayVolume?: number;
  /** Min number of market quotes for a day to count (default 1) */
  minMarkets?: number;
};

function isMiscCropName(name: string): boolean {
  const t = name.trim();
  if (!t) return true;
  if (t === "其他" || t.startsWith("其他")) return true;
  // MOA catch-all grades: 甘藍-其他、李-其他、西瓜-其他…
  if (t.endsWith("-其他") || t.includes("-其他")) return true;
  return false;
}

/**
 * National average for one crop on one day:
 * volume-weighted when any positive volume exists; else simple mean of prices.
 */
export function nationalDayUnitPrice(
  rows: Array<{ avgPrice: number; volume?: number }>,
): { price: number; volume: number; marketCount: number } | null {
  const priced = rows.filter((r) => r.avgPrice > 0);
  if (priced.length === 0) return null;

  let volSum = 0;
  let weighted = 0;
  for (const r of priced) {
    const v = r.volume ?? 0;
    if (v > 0) {
      volSum += v;
      weighted += r.avgPrice * v;
    }
  }
  const price =
    volSum > 0
      ? weighted / volSum
      : priced.reduce((s, r) => s + r.avgPrice, 0) / priced.length;

  return {
    price,
    volume: volSum,
    marketCount: priced.length,
  };
}

/**
 * Build per-crop day series (unsorted map). Skips miscellaneous buckets.
 */
export function buildCropNationalPriceSeries(
  rows: PricedTradeRow[],
): Map<string, { cropCode: string; days: DayPoint[] }> {
  const buckets = new Map<
    string,
    Map<string, Array<{ avgPrice: number; volume?: number; cropCode: string }>>
  >();

  for (const r of rows) {
    if (!r.cropName || !r.date || !(r.avgPrice > 0)) continue;
    if (isMiscCropName(r.cropName)) continue;

    if (!buckets.has(r.cropName)) buckets.set(r.cropName, new Map());
    const byDate = buckets.get(r.cropName)!;
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push({
      avgPrice: r.avgPrice,
      volume: r.volume,
      cropCode: r.cropCode ?? "",
    });
  }

  const out = new Map<string, { cropCode: string; days: DayPoint[] }>();

  for (const [cropName, byDateRows] of buckets) {
    const days: DayPoint[] = [];
    let cropCode = "";
    for (const [date, dayRows] of byDateRows) {
      const agg = nationalDayUnitPrice(dayRows);
      if (!agg) continue;
      days.push({
        date,
        price: agg.price,
        volume: agg.volume,
        marketCount: agg.marketCount,
      });
      if (!cropCode && dayRows[0]?.cropCode) cropCode = dayRows[0].cropCode;
    }
    days.sort((a, b) => a.date.localeCompare(b.date));
    if (days.length > 0) {
      out.set(cropName, { cropCode, days });
    }
  }
  return out;
}

function dayIsReliable(day: DayPoint, opts: SeriesOptions): boolean {
  const minVol = opts.minDayVolume ?? 0;
  const minMkts = opts.minMarkets ?? 1;
  if (day.marketCount < minMkts) return false;
  // Soft floor: ignore near-zero liquidity days that create fake baselines.
  // Days with only prices and zero volume everywhere still pass if minDayVolume is 0.
  if (minVol > 0 && day.volume < minVol) return false;
  return day.price > 0;
}

export type CropDayChange = {
  cropName: string;
  cropCode: string;
  latestDate: string;
  previousDate: string;
  latestPrice: number;
  previousPrice: number;
  latestVolume: number;
  previousVolume: number;
  priceChange: number;
};

/**
 * For each crop: among reliable days only, latest vs immediately previous.
 */
export function cropChangesFromNationalSeries(
  series: Map<string, { cropCode: string; days: DayPoint[] }>,
  opts: SeriesOptions = {},
): CropDayChange[] {
  const results: CropDayChange[] = [];

  for (const [cropName, { cropCode, days }] of series) {
    const reliable = days.filter((d) => dayIsReliable(d, opts));
    if (reliable.length < 2) continue;

    const latest = reliable[reliable.length - 1];
    const previous = reliable[reliable.length - 2];
    if (!(previous.price > 0)) continue;

    const priceChange =
      ((latest.price - previous.price) / previous.price) * 100;

    results.push({
      cropName,
      cropCode,
      latestDate: latest.date,
      previousDate: previous.date,
      latestPrice: latest.price,
      previousPrice: previous.price,
      latestVolume: latest.volume,
      previousVolume: previous.volume,
      priceChange: Math.round(priceChange * 10) / 10,
    });
  }

  return results;
}
