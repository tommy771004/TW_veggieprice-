/**
 * Pure helpers: national high price per crop per day, and % change
 * between a crop's latest priced day and its previous priced day.
 *
 * Product rule:
 * - Unit = 元/公斤.
 * - Day price = max high quote across all markets that day (volume ignored).
 *   Per market: prefer 上價 (upperPrice), else 平均價 (avgPrice).
 * - A day qualifies if any positive high exists (no volume gate).
 */

export type PricedTradeRow = {
  cropName: string;
  cropCode?: string;
  date: string; // ISO preferred
  avgPrice: number;
  /** 上價 / high; preferred for "最高價" when > 0 */
  upperPrice?: number;
  volume?: number;
};

export type DayPoint = {
  date: string;
  /** National high 元/公斤 that day */
  price: number;
  marketCount: number;
};

function isMiscCropName(name: string): boolean {
  const t = name.trim();
  if (!t) return true;
  if (t === "其他" || t.startsWith("其他")) return true;
  if (t.endsWith("-其他") || t.includes("-其他")) return true;
  return false;
}

/** One market's high for the day: upper if set, else avg. */
export function marketHighPrice(row: {
  avgPrice: number;
  upperPrice?: number;
}): number {
  if (row.upperPrice !== undefined && row.upperPrice > 0) {
    return row.upperPrice;
  }
  return row.avgPrice > 0 ? row.avgPrice : 0;
}

/**
 * Max of market highs across markets (volume not used).
 */
export function nationalDayHighPrice(
  rows: Array<{ avgPrice: number; upperPrice?: number }>,
): { price: number; marketCount: number } | null {
  let max = 0;
  let marketCount = 0;
  for (const r of rows) {
    const h = marketHighPrice(r);
    if (h > 0) {
      marketCount += 1;
      if (h > max) max = h;
    }
  }
  if (marketCount === 0 || max <= 0) return null;
  return { price: max, marketCount };
}

/** @deprecated alias — prefer nationalDayHighPrice */
export function nationalDayUnitPrice(
  rows: Array<{ avgPrice: number; upperPrice?: number; volume?: number }>,
): { price: number; marketCount: number } | null {
  return nationalDayHighPrice(rows);
}

/**
 * Build per-crop day series. Skips miscellaneous "其他…" buckets.
 */
export function buildCropNationalPriceSeries(
  rows: PricedTradeRow[],
): Map<string, { cropCode: string; days: DayPoint[] }> {
  const buckets = new Map<
    string,
    Map<
      string,
      Array<{ avgPrice: number; upperPrice?: number; cropCode: string }>
    >
  >();

  for (const r of rows) {
    const high = marketHighPrice(r);
    if (!r.cropName || !r.date || !(high > 0)) continue;
    if (isMiscCropName(r.cropName)) continue;

    if (!buckets.has(r.cropName)) buckets.set(r.cropName, new Map());
    const byDate = buckets.get(r.cropName)!;
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push({
      avgPrice: r.avgPrice,
      upperPrice: r.upperPrice,
      cropCode: r.cropCode ?? "",
    });
  }

  const out = new Map<string, { cropCode: string; days: DayPoint[] }>();

  for (const [cropName, byDateRows] of buckets) {
    const days: DayPoint[] = [];
    let cropCode = "";
    for (const [date, dayRows] of byDateRows) {
      const agg = nationalDayHighPrice(dayRows);
      if (!agg) continue;
      days.push({
        date,
        price: agg.price,
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

export type CropDayChange = {
  cropName: string;
  cropCode: string;
  latestDate: string;
  previousDate: string;
  latestPrice: number;
  previousPrice: number;
  priceChange: number;
};

/**
 * For each crop: latest day with a high vs the previous day with a high.
 */
export function cropChangesFromNationalSeries(
  series: Map<string, { cropCode: string; days: DayPoint[] }>,
): CropDayChange[] {
  const results: CropDayChange[] = [];

  for (const [cropName, { cropCode, days }] of series) {
    const priced = days.filter((d) => d.price > 0);
    if (priced.length < 2) continue;

    const latest = priced[priced.length - 1];
    const previous = priced[priced.length - 2];
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
      priceChange: Math.round(priceChange * 10) / 10,
    });
  }

  return results;
}
