/**
 * Pure search-result aggregation — no I/O, safe for node:test without path aliases.
 *
 * Every feed (蔬果 open data、漁產 snapshot、畜產 snapshot) lands here as flat dated
 * quotes and comes out as one representative row per 品種代碼＋市場, carrying that
 * row's real trading date and the % change against the series' previous trading day.
 *
 * Product rules:
 * - A quote only counts when it has a normalized ISO date and a positive 平均價.
 * - Quotes are collapsed per 品種代碼＋市場＋日期 first (a market can quote the same
 *   item several times a day), then the series picks one day to represent.
 * - The representative day is the latest priced day inside the requested window.
 *   When the window itself is closed (weekend/holiday/stale feed), the latest
 *   priced day in the look-back stands in — with its own real date, never today's.
 * - priceChange compares that day against the previous priced day of the same
 *   series, so it stays holiday-aware without a fixed calendar step.
 */
import type { ProducePrice } from "../types.ts";

/** One market's quote for one item on one day, already date-normalized. */
export type DatedQuote = {
  cropCode: string;
  cropName: string;
  marketName: string;
  grade?: string;
  upperPrice: number;
  middlePrice: number;
  lowerPrice: number;
  avgPrice: number;
  transWeight: number;
  /** ISO YYYY-MM-DD. */
  date: string;
};

export type SearchWindow = {
  /** First day the user asked for (inclusive). */
  startDate: string;
  /** Last day the user asked for (inclusive). */
  endDate: string;
  /**
   * Earliest day usable as a baseline or fallback (inclusive). Days between
   * lookbackStart and startDate never surface on their own — they only provide
   * the previous-day baseline, or stand in when the requested window is closed.
   */
  lookbackStart: string;
};

export type SearchRecord = ProducePrice & { grade?: string };

type DayAggregate = {
  avgSum: number;
  quoteCount: number;
  transWeight: number;
  upperPrice: number;
  middlePrice: number;
  lowerPrice: number;
};

type SeriesState = {
  cropCode: string;
  cropName: string;
  marketName: string;
  grade?: string;
  byDate: Map<string, DayAggregate>;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

export function aggregateSearchRecords(
  quotes: readonly DatedQuote[],
  window: SearchWindow,
): SearchRecord[] {
  const { startDate, endDate, lookbackStart } = window;
  const series = new Map<string, SeriesState>();

  for (const quote of quotes) {
    if (!quote.date || !(quote.avgPrice > 0)) continue;
    if (quote.date < lookbackStart || quote.date > endDate) continue;

    const key = `${quote.cropCode}_${quote.marketName}`;
    let state = series.get(key);
    if (!state) {
      state = {
        cropCode: quote.cropCode,
        cropName: quote.cropName,
        marketName: quote.marketName,
        grade: quote.grade,
        byDate: new Map(),
      };
      series.set(key, state);
    }

    const day = state.byDate.get(quote.date) ?? {
      avgSum: 0,
      quoteCount: 0,
      transWeight: 0,
      upperPrice: quote.upperPrice,
      middlePrice: quote.middlePrice,
      lowerPrice: quote.lowerPrice,
    };
    day.avgSum += quote.avgPrice;
    day.quoteCount += 1;
    day.transWeight += quote.transWeight || 0;
    day.upperPrice = Math.max(day.upperPrice, quote.upperPrice);
    day.lowerPrice = Math.min(day.lowerPrice, quote.lowerPrice);
    day.middlePrice = quote.middlePrice;
    state.byDate.set(quote.date, day);
  }

  const records: SearchRecord[] = [];

  for (const state of series.values()) {
    const dated = [...state.byDate.entries()]
      .map(([date, day]) => ({ date, price: day.avgSum / day.quoteCount, day }))
      .filter((entry) => entry.price > 0)
      .sort((left, right) => left.date.localeCompare(right.date));

    if (dated.length === 0) continue;

    // Latest priced day inside the requested window; everything is already
    // capped at endDate, so only the lower bound needs checking.
    let latestIndex = -1;
    for (let i = dated.length - 1; i >= 0; i--) {
      if (dated[i].date >= startDate) {
        latestIndex = i;
        break;
      }
    }
    // Window closed for this series — fall back to the newest day we do have.
    if (latestIndex === -1) latestIndex = dated.length - 1;

    const latest = dated[latestIndex];
    const previous = latestIndex > 0 ? dated[latestIndex - 1] : null;
    const priceChange =
      previous && previous.price > 0
        ? ((latest.price - previous.price) / previous.price) * 100
        : 0;

    records.push({
      cropCode: state.cropCode,
      cropName: state.cropName,
      marketName: state.marketName,
      ...(state.grade ? { grade: state.grade } : {}),
      upperPrice: round1(latest.day.upperPrice),
      middlePrice: round1(latest.day.middlePrice),
      lowerPrice: round1(latest.day.lowerPrice),
      avgPrice: round1(latest.price),
      transWeight: Math.round(latest.day.transWeight),
      date: latest.date,
      priceChange: round1(priceChange),
    });
  }

  records.sort((left, right) =>
    left.cropName.localeCompare(right.cropName, "zh-TW"),
  );

  return records;
}

type CropDayAggregate = {
  avgSum: number;
  upperSum: number;
  middleSum: number;
  lowerSum: number;
  transWeight: number;
  marketCount: number;
};

type CropSeriesState = {
  cropCode: string;
  /** Date the kept cropCode was last seen on, so the newest code wins. */
  cropCodeDate: string;
  cropName: string;
  byDate: Map<string, CropDayAggregate>;
};

/**
 * One row per 品種 across every market in `quotes` — the 全國均價 view used when
 * the search page asks for 全部市場 (or a whole region).
 *
 * Same rule as the produce page's national series (historyAggregation scheme C):
 * - each market's quotes for a day collapse to that market's day price first;
 * - the crop's day price is the simple mean of the markets' 上／中／下／平均價,
 *   交易量 is their sum, and `marketCount` is how many markets traded that day;
 * - the representative day and the % change follow `aggregateSearchRecords`,
 *   but on the cross-market day means, so markets on different trading days
 *   never mix into one number;
 * - rows are keyed by 品名, not 品種代碼: the feed sometimes files one 品名 under
 *   two codes, and the user asked for one row per vegetable. The newest code is
 *   kept for the illustration lookup.
 */
export function aggregateSearchRecordsByCrop(
  quotes: readonly DatedQuote[],
  window: SearchWindow,
  scopeLabel: string,
): SearchRecord[] {
  const { startDate, endDate, lookbackStart } = window;

  const marketDays = new Map<
    string,
    { cropKey: string; cropCode: string; cropName: string; date: string } & DayAggregate
  >();
  for (const quote of quotes) {
    if (!quote.date || !(quote.avgPrice > 0)) continue;
    if (quote.date < lookbackStart || quote.date > endDate) continue;

    const cropKey = quote.cropName || quote.cropCode;
    const key = `${cropKey}_${quote.marketName}_${quote.date}`;
    const day = marketDays.get(key) ?? {
      cropKey,
      cropCode: quote.cropCode,
      cropName: quote.cropName,
      date: quote.date,
      avgSum: 0,
      quoteCount: 0,
      transWeight: 0,
      upperPrice: quote.upperPrice,
      middlePrice: quote.middlePrice,
      lowerPrice: quote.lowerPrice,
    };
    day.avgSum += quote.avgPrice;
    day.quoteCount += 1;
    day.transWeight += quote.transWeight || 0;
    day.upperPrice = Math.max(day.upperPrice, quote.upperPrice);
    day.lowerPrice = Math.min(day.lowerPrice, quote.lowerPrice);
    day.middlePrice = quote.middlePrice;
    marketDays.set(key, day);
  }

  const crops = new Map<string, CropSeriesState>();
  for (const day of marketDays.values()) {
    let crop = crops.get(day.cropKey);
    if (!crop) {
      crop = { cropCode: day.cropCode, cropCodeDate: day.date, cropName: day.cropName, byDate: new Map() };
      crops.set(day.cropKey, crop);
    } else if (day.cropCode && day.date > crop.cropCodeDate) {
      crop.cropCode = day.cropCode;
      crop.cropCodeDate = day.date;
    }
    const aggregate = crop.byDate.get(day.date) ?? {
      avgSum: 0,
      upperSum: 0,
      middleSum: 0,
      lowerSum: 0,
      transWeight: 0,
      marketCount: 0,
    };
    aggregate.avgSum += day.avgSum / day.quoteCount;
    aggregate.upperSum += day.upperPrice;
    aggregate.middleSum += day.middlePrice;
    aggregate.lowerSum += day.lowerPrice;
    aggregate.transWeight += day.transWeight;
    aggregate.marketCount += 1;
    crop.byDate.set(day.date, aggregate);
  }

  const records: SearchRecord[] = [];
  for (const crop of crops.values()) {
    const dated = [...crop.byDate.entries()]
      .map(([date, day]) => ({ date, price: day.avgSum / day.marketCount, day }))
      .sort((left, right) => left.date.localeCompare(right.date));
    if (dated.length === 0) continue;

    let latestIndex = -1;
    for (let i = dated.length - 1; i >= 0; i--) {
      if (dated[i].date >= startDate) {
        latestIndex = i;
        break;
      }
    }
    if (latestIndex === -1) latestIndex = dated.length - 1;

    const latest = dated[latestIndex];
    const previous = latestIndex > 0 ? dated[latestIndex - 1] : null;
    const priceChange =
      previous && previous.price > 0
        ? ((latest.price - previous.price) / previous.price) * 100
        : 0;
    const n = latest.day.marketCount;

    records.push({
      cropCode: crop.cropCode,
      cropName: crop.cropName,
      marketName: scopeLabel,
      upperPrice: round1(latest.day.upperSum / n),
      middlePrice: round1(latest.day.middleSum / n),
      lowerPrice: round1(latest.day.lowerSum / n),
      avgPrice: round1(latest.price),
      transWeight: Math.round(latest.day.transWeight),
      date: latest.date,
      priceChange: round1(priceChange),
      marketCount: n,
    });
  }

  records.sort((left, right) =>
    left.cropName.localeCompare(right.cropName, "zh-TW"),
  );

  return records;
}
