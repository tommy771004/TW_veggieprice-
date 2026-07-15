import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCropNationalPriceSeries,
  cropChangesFromNationalSeries,
  marketHighPrice,
  nationalDayHighPrice,
} from "./nationalDayPrice.ts";

describe("marketHighPrice", () => {
  it("prefers upper over avg", () => {
    assert.equal(marketHighPrice({ avgPrice: 20, upperPrice: 35 }), 35);
  });

  it("falls back to avg when upper missing", () => {
    assert.equal(marketHighPrice({ avgPrice: 20 }), 20);
  });
});

describe("nationalDayHighPrice", () => {
  it("takes max high across markets, ignores volume", () => {
    const p = nationalDayHighPrice([
      { avgPrice: 10, upperPrice: 12 },
      { avgPrice: 30, upperPrice: 40 },
      { avgPrice: 25, upperPrice: 28 },
    ]);
    assert.ok(p);
    assert.equal(p!.price, 40);
    assert.equal(p!.marketCount, 3);
  });
});

describe("cropChangesFromNationalSeries", () => {
  it("compares max high on latest day vs previous day", () => {
    const series = buildCropNationalPriceSeries([
      {
        cropName: "高麗菜",
        cropCode: "A",
        date: "2026-07-12",
        avgPrice: 20,
        upperPrice: 22,
      },
      {
        cropName: "高麗菜",
        cropCode: "A",
        date: "2026-07-12",
        avgPrice: 18,
        upperPrice: 25,
      },
      {
        cropName: "高麗菜",
        cropCode: "A",
        date: "2026-07-14",
        avgPrice: 30,
        upperPrice: 33,
      },
      {
        cropName: "高麗菜",
        cropCode: "A",
        date: "2026-07-14",
        avgPrice: 28,
        upperPrice: 40,
      },
      {
        cropName: "其他",
        date: "2026-07-14",
        avgPrice: 99,
        upperPrice: 120,
      },
    ]);
    // day12 max high = 25, day14 max high = 40 → +60%
    const changes = cropChangesFromNationalSeries(series);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].cropName, "高麗菜");
    assert.equal(changes[0].previousPrice, 25);
    assert.equal(changes[0].latestPrice, 40);
    assert.equal(changes[0].priceChange, 60);
  });

  it("excludes -其他 catch-all grades", () => {
    const series = buildCropNationalPriceSeries([
      { cropName: "甘藍-其他", date: "2026-07-12", avgPrice: 14, upperPrice: 20 },
      { cropName: "甘藍-其他", date: "2026-07-14", avgPrice: 31, upperPrice: 40 },
    ]);
    assert.equal(cropChangesFromNationalSeries(series).length, 0);
  });
});
