/**
 * Pure helpers: national avg price per crop per day, and % change
 * between a crop's latest priced day and its previous priced day.
 *
 * Product rule:
 * - Unit = 元/公斤 (open data 平均價).
 * - Day price = simple mean of each market's 平均價 (volume ignored).
 * - A day qualifies if any positive avg price exists.
 */

export type PricedTradeRow = {
  cropName: string;
  cropCode?: string;
  date: string; // ISO preferred
  /** 平均價 元/公斤 */
  avgPrice: number;
  volume?: number;
};

export type DayPoint = {
  date: string;
  /** National mean of market avg prices 元/公斤 */
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

/**
 * Simple mean of positive market avg prices (volume not used).
 */
export function nationalDayMeanAvgPrice(
  rows: Array<{ avgPrice: number }>,
): { price: number; marketCount: number } | null {
  const priced = rows.filter((r) => r.avgPrice > 0);
  if (priced.length === 0) return null;

  const price =
    priced.reduce((s, r) => s + r.avgPrice, 0) / priced.length;

  return {
    price,
    marketCount: priced.length,
  };
}

/** @deprecated alias */
export function nationalDayUnitPrice(
  rows: Array<{ avgPrice: number; volume?: number }>,
): { price: number; marketCount: number } | null {
  return nationalDayMeanAvgPrice(rows);
}

/**
 * Build per-crop day series. Skips miscellaneous "其他…" buckets.
 */
export function buildCropNationalPriceSeries(
  rows: PricedTradeRow[],
): Map<string, { cropCode: string; days: DayPoint[] }> {
  const buckets = new Map<
    string,
    Map<string, Array<{ avgPrice: number; cropCode: string }>>
  >();

  for (const r of rows) {
    if (!r.cropName || !r.date || !(r.avgPrice > 0)) continue;
    if (isMiscCropName(r.cropName)) continue;

    if (!buckets.has(r.cropName)) buckets.set(r.cropName, new Map());
    const byDate = buckets.get(r.cropName)!;
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push({
      avgPrice: r.avgPrice,
      cropCode: r.cropCode ?? "",
    });
  }

  const out = new Map<string, { cropCode: string; days: DayPoint[] }>();

  for (const [cropName, byDateRows] of buckets) {
    const days: DayPoint[] = [];
    let cropCode = "";
    for (const [date, dayRows] of byDateRows) {
      const agg = nationalDayMeanAvgPrice(dayRows);
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
 * For each crop: latest day with avg price vs the previous day with avg price.
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
