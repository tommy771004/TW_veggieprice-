import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateSearchRecords,
  aggregateSearchRecordsByCrop,
  type DatedQuote,
  type SearchWindow,
} from "./searchAggregation.ts";

const quote = (overrides: Partial<DatedQuote> = {}): DatedQuote => ({
  cropCode: "1011",
  cropName: "吳郭魚",
  marketName: "三重",
  grade: "中平",
  upperPrice: 80,
  middlePrice: 67.4,
  lowerPrice: 41.7,
  avgPrice: 57.6,
  transWeight: 9819.2,
  date: "2026-08-21",
  ...overrides,
});

/** 1-day query on 2026-08-24 (a Sunday), with the usual 7-day look-back. */
const sundayWindow: SearchWindow = {
  startDate: "2026-08-24",
  endDate: "2026-08-24",
  lookbackStart: "2026-08-17",
};

const weekWindow: SearchWindow = {
  startDate: "2026-08-18",
  endDate: "2026-08-24",
  lookbackStart: "2026-08-11",
};

describe("aggregateSearchRecords — one row per 品種代碼＋市場", () => {
  it("collapses a multi-day feed to a single representative row", () => {
    const records = aggregateSearchRecords(
      [
        quote({ date: "2026-08-19", avgPrice: 50 }),
        quote({ date: "2026-08-20", avgPrice: 55 }),
        quote({ date: "2026-08-21", avgPrice: 60 }),
      ],
      sundayWindow,
    );
    assert.equal(records.length, 1);
    assert.equal(records[0].date, "2026-08-21");
    assert.equal(records[0].avgPrice, 60);
  });

  it("keeps different markets and different crop codes apart", () => {
    const records = aggregateSearchRecords(
      [
        quote({ cropCode: "M01", cropName: "毛豬", marketName: "全國平均" }),
        quote({ cropCode: "M02", cropName: "羊", marketName: "全國平均" }),
        quote({ cropCode: "M01", cropName: "毛豬", marketName: "花蓮縣" }),
      ],
      sundayWindow,
    );
    assert.equal(records.length, 3);
  });

  it("averages several quotes for the same item, market and day", () => {
    const records = aggregateSearchRecords(
      [
        quote({ avgPrice: 50, upperPrice: 60, lowerPrice: 40, transWeight: 100 }),
        quote({ avgPrice: 70, upperPrice: 90, lowerPrice: 30, transWeight: 150 }),
      ],
      sundayWindow,
    );
    assert.equal(records.length, 1);
    assert.equal(records[0].avgPrice, 60);
    assert.equal(records[0].upperPrice, 90, "上價 takes the day's high");
    assert.equal(records[0].lowerPrice, 30, "下價 takes the day's low");
    assert.equal(records[0].transWeight, 250, "交易量 sums across quotes");
  });
});

describe("aggregateSearchRecords — date window", () => {
  it("keeps the real trading date instead of the queried date", () => {
    const [record] = aggregateSearchRecords(
      [quote({ date: "2026-08-21" })],
      sundayWindow,
    );
    assert.equal(record.date, "2026-08-21");
    assert.notEqual(record.date, sundayWindow.endDate);
  });

  it("drops quotes newer than the requested window", () => {
    const records = aggregateSearchRecords(
      [quote({ date: "2026-08-25" })],
      sundayWindow,
    );
    assert.deepEqual(records, []);
  });

  it("drops quotes older than the look-back", () => {
    const records = aggregateSearchRecords(
      [quote({ date: "2026-08-04" })],
      sundayWindow,
    );
    assert.deepEqual(records, []);
  });

  it("prefers a day inside the requested window over an older one", () => {
    const [record] = aggregateSearchRecords(
      [
        quote({ date: "2026-08-14", avgPrice: 10 }),
        quote({ date: "2026-08-19", avgPrice: 20 }),
        quote({ date: "2026-08-21", avgPrice: 30 }),
      ],
      weekWindow,
    );
    assert.equal(record.date, "2026-08-21");
  });

  it("falls back to the newest look-back day when the window is closed", () => {
    // Nothing traded on the requested Sunday; 08-21 (Friday) stands in.
    const [record] = aggregateSearchRecords(
      [quote({ date: "2026-08-20" }), quote({ date: "2026-08-21" })],
      sundayWindow,
    );
    assert.equal(record.date, "2026-08-21");
  });

  it("does not let a look-back day mask a real in-window day", () => {
    const [record] = aggregateSearchRecords(
      [
        quote({ date: "2026-08-12", avgPrice: 99 }),
        quote({ date: "2026-08-18", avgPrice: 11 }),
      ],
      weekWindow,
    );
    assert.equal(record.date, "2026-08-18");
    assert.equal(record.avgPrice, 11);
  });
});

describe("aggregateSearchRecords — priceChange", () => {
  it("compares the representative day against the previous priced day", () => {
    const [record] = aggregateSearchRecords(
      [
        quote({ date: "2026-08-20", avgPrice: 50 }),
        quote({ date: "2026-08-21", avgPrice: 60 }),
      ],
      sundayWindow,
    );
    assert.equal(record.priceChange, 20);
  });

  it("goes negative when the price fell", () => {
    const [record] = aggregateSearchRecords(
      [
        quote({ date: "2026-08-20", avgPrice: 80 }),
        quote({ date: "2026-08-21", avgPrice: 60 }),
      ],
      sundayWindow,
    );
    assert.equal(record.priceChange, -25);
  });

  it("skips closed days rather than assuming a calendar step", () => {
    // 08-19 closed: the baseline is 08-18, not a zero-filled 08-20.
    const [record] = aggregateSearchRecords(
      [
        quote({ date: "2026-08-18", avgPrice: 100 }),
        quote({ date: "2026-08-20", avgPrice: 110 }),
      ],
      sundayWindow,
    );
    assert.equal(record.date, "2026-08-20");
    assert.equal(record.priceChange, 10);
  });

  it("is 0 when the series has only one priced day", () => {
    const [record] = aggregateSearchRecords(
      [quote({ date: "2026-08-21" })],
      sundayWindow,
    );
    assert.equal(record.priceChange, 0);
  });

  it("uses the day before the representative day, not the newest day", () => {
    const [record] = aggregateSearchRecords(
      [
        quote({ date: "2026-08-12", avgPrice: 100 }),
        quote({ date: "2026-08-13", avgPrice: 120 }),
        quote({ date: "2026-08-21", avgPrice: 200 }),
      ],
      { startDate: "2026-08-13", endDate: "2026-08-13", lookbackStart: "2026-08-06" },
    );
    assert.equal(record.date, "2026-08-13");
    assert.equal(record.priceChange, 20);
  });
});

describe("aggregateSearchRecords — hygiene", () => {
  it("ignores quotes with no date or no positive price", () => {
    const records = aggregateSearchRecords(
      [
        quote({ date: "" }),
        quote({ avgPrice: 0 }),
        quote({ avgPrice: -5 }),
      ],
      sundayWindow,
    );
    assert.deepEqual(records, []);
  });

  it("rounds prices to one decimal and volume to an integer", () => {
    const [record] = aggregateSearchRecords(
      [
        quote({
          avgPrice: 57.649,
          upperPrice: 80.06,
          middlePrice: 67.44,
          lowerPrice: 41.75,
          transWeight: 9819.2,
        }),
      ],
      sundayWindow,
    );
    assert.equal(record.avgPrice, 57.6);
    assert.equal(record.upperPrice, 80.1);
    assert.equal(record.middlePrice, 67.4);
    assert.equal(record.lowerPrice, 41.8);
    assert.equal(record.transWeight, 9819);
  });

  it("sorts by crop name in zh-TW", () => {
    const records = aggregateSearchRecords(
      [
        quote({ cropCode: "3", cropName: "鮭魚" }),
        quote({ cropCode: "1", cropName: "白鯧" }),
        quote({ cropCode: "2", cropName: "午仔魚" }),
      ],
      sundayWindow,
    );
    assert.deepEqual(
      records.map((r) => r.cropName),
      ["午仔魚", "白鯧", "鮭魚"],
    );
  });

  it("returns nothing for an empty feed", () => {
    assert.deepEqual(aggregateSearchRecords([], sundayWindow), []);
  });
});

describe("aggregateSearchRecordsByCrop — one 全國均價 row per 品種", () => {
  const veg = (overrides: Partial<DatedQuote>) =>
    quote({ cropCode: "LB2", cropName: "小白菜-蚵仔白", grade: undefined, ...overrides });

  it("averages the markets that traded on the representative day and compares day means", () => {
    const records = aggregateSearchRecordsByCrop(
      [
        veg({ marketName: "台北一", date: "2026-08-20", avgPrice: 50, upperPrice: 70, lowerPrice: 30, transWeight: 1000 }),
        veg({ marketName: "台北一", date: "2026-08-21", avgPrice: 60, upperPrice: 80, lowerPrice: 40, transWeight: 1200 }),
        veg({ marketName: "西螺鎮", date: "2026-08-20", avgPrice: 44, upperPrice: 60, lowerPrice: 20, transWeight: 800 }),
        veg({ marketName: "西螺鎮", date: "2026-08-21", avgPrice: 40, upperPrice: 50, lowerPrice: 20, transWeight: 900 }),
      ],
      sundayWindow,
      "全國均價",
    );

    assert.equal(records.length, 1);
    const [row] = records;
    assert.equal(row.marketName, "全國均價");
    assert.equal(row.date, "2026-08-21");
    assert.equal(row.avgPrice, 50);
    assert.equal(row.upperPrice, 65);
    assert.equal(row.lowerPrice, 30);
    assert.equal(row.transWeight, 2100);
    assert.equal(row.marketCount, 2);
    // (50 - 47) / 47
    assert.equal(row.priceChange, 6.4);
  });

  it("never mixes a market's older day into a newer day's mean", () => {
    const [row] = aggregateSearchRecordsByCrop(
      [
        veg({ marketName: "台北一", date: "2026-08-21", avgPrice: 60 }),
        veg({ marketName: "西螺鎮", date: "2026-08-20", avgPrice: 40 }),
      ],
      sundayWindow,
      "全國均價",
    );
    assert.equal(row.date, "2026-08-21");
    assert.equal(row.avgPrice, 60);
    assert.equal(row.marketCount, 1);
    // previous priced day is 08-20 (西螺鎮 only, 40)
    assert.equal(row.priceChange, 50);
  });

  it("collapses a market's repeated quotes before averaging across markets", () => {
    const [row] = aggregateSearchRecordsByCrop(
      [
        veg({ marketName: "台北一", date: "2026-08-21", avgPrice: 50 }),
        veg({ marketName: "台北一", date: "2026-08-21", avgPrice: 70 }),
        veg({ marketName: "西螺鎮", date: "2026-08-21", avgPrice: 40 }),
      ],
      sundayWindow,
      "北部均價",
    );
    assert.equal(row.avgPrice, 50);
    assert.equal(row.marketCount, 2);
    assert.equal(row.marketName, "北部均價");
  });

  it("merges one 品名 filed under two codes into a single row", () => {
    const records = aggregateSearchRecordsByCrop(
      [
        veg({ cropCode: "LB9", marketName: "台北一", date: "2026-08-19", avgPrice: 30 }),
        veg({ cropCode: "LB2", marketName: "台北一", date: "2026-08-21", avgPrice: 50 }),
        veg({ cropCode: "LB2", marketName: "西螺鎮", date: "2026-08-21", avgPrice: 40 }),
      ],
      sundayWindow,
      "全國均價",
    );
    assert.equal(records.length, 1);
    assert.equal(records[0].cropCode, "LB2");
    assert.equal(records[0].avgPrice, 45);
    assert.equal(records[0].marketCount, 2);
    assert.equal(records[0].priceChange, 50);
  });

  it("keeps different 品種 apart and sorts by name", () => {
    const records = aggregateSearchRecordsByCrop(
      [
        veg({ cropCode: "LB3", cropName: "小白菜-奶油白", marketName: "台北一", date: "2026-08-21" }),
        veg({ marketName: "台北一", date: "2026-08-21" }),
        veg({ marketName: "台北二", date: "2026-08-21" }),
      ],
      sundayWindow,
      "全國均價",
    );
    assert.deepEqual(
      records.map((r) => [r.cropName, r.marketCount]),
      [
        ["小白菜-奶油白", 1],
        ["小白菜-蚵仔白", 2],
      ].sort((a, b) => String(a[0]).localeCompare(String(b[0]), "zh-TW")),
    );
  });
});
