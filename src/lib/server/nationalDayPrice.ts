/**
 * Pure helpers: national unit price per crop per day, and % change
 * between a crop's latest priced day and its previous priced day.
 * Volume is optional — price alone qualifies a day (product rule).
 */

export type PricedTradeRow = {
  cropName: string;
  cropCode?: string;
  date: string; // ISO preferred
  avgPrice: number;
  volume?: number;
};

export type NationalDayPrice = {
  date: string;
  /** Unit price in source units (usually 元/公斤) */
  price: number;
  cropCode: string;
};

function isMiscCropName(name: string): boolean {
  const t = name.trim();
  return t === "其他" || t.startsWith("其他");
}

/**
 * National average for one crop on one day:
 * volume-weighted when any positive volume exists; else simple mean of prices.
 */
export function nationalDayUnitPrice(
  rows: Array<{ avgPrice: number; volume?: number }>,
): number | null {
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
  if (volSum > 0) {
    return weighted / volSum;
  }
  return priced.reduce((s, r) => s + r.avgPrice, 0) / priced.length;
}

/**
 * Build per-crop ascending date → national unit price (source units).
 * Skips miscellaneous "其他…" buckets.
 */
export function buildCropNationalPriceSeries(
  rows: PricedTradeRow[],
): Map<string, { cropCode: string; byDate: Map<string, number> }> {
  // cropName -> date -> list of market rows
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

  const out = new Map<string, { cropCode: string; byDate: Map<string, number> }>();

  for (const [cropName, byDateRows] of buckets) {
    const byDate = new Map<string, number>();
    let cropCode = "";
    for (const [date, dayRows] of byDateRows) {
      const p = nationalDayUnitPrice(dayRows);
      if (p === null) continue;
      byDate.set(date, p);
      if (!cropCode && dayRows[0]?.cropCode) cropCode = dayRows[0].cropCode;
    }
    if (byDate.size > 0) {
      out.set(cropName, { cropCode, byDate });
    }
  }
  return out;
}

export type CropDayChange = {
  cropName: string;
  cropCode: string;
  latestDate: string;
  previousDate: string;
  /** Source unit price on latest day (e.g. 元/公斤) */
  latestPrice: number;
  previousPrice: number;
  priceChange: number;
};

/**
 * For each crop: latest priced day vs immediately previous priced day.
 */
export function cropChangesFromNationalSeries(
  series: Map<string, { cropCode: string; byDate: Map<string, number> }>,
): CropDayChange[] {
  const results: CropDayChange[] = [];

  for (const [cropName, { cropCode, byDate }] of series) {
    const dates = [...byDate.keys()].sort();
    if (dates.length < 2) continue;

    const latestDate = dates[dates.length - 1];
    const previousDate = dates[dates.length - 2];
    const latestPrice = byDate.get(latestDate)!;
    const previousPrice = byDate.get(previousDate)!;
    if (!(previousPrice > 0)) continue;

    const priceChange =
      ((latestPrice - previousPrice) / previousPrice) * 100;

    results.push({
      cropName,
      cropCode,
      latestDate,
      previousDate,
      latestPrice,
      previousPrice,
      priceChange: Math.round(priceChange * 10) / 10,
    });
  }

  return results;
}
