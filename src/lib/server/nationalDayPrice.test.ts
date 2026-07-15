import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCropNationalPriceSeries,
  cropChangesFromNationalSeries,
  nationalDayUnitPrice,
} from "./nationalDayPrice.ts";

describe("nationalDayUnitPrice", () => {
  it("simple-means market prices and ignores volume", () => {
    const p = nationalDayUnitPrice([
      { avgPrice: 10, volume: 10000 },
      { avgPrice: 30, volume: 1 },
    ]);
    assert.ok(p);
    // Equal weight markets — not volume-weighted 10-ish
    assert.equal(p!.price, 20);
    assert.equal(p!.marketCount, 2);
  });
});

describe("cropChangesFromNationalSeries", () => {
  it("compares latest priced day to previous priced day", () => {
    const series = buildCropNationalPriceSeries([
      {
        cropName: "高麗菜",
        cropCode: "A",
        date: "2026-07-10",
        avgPrice: 20,
        volume: 1,
      },
      {
        cropName: "高麗菜",
        cropCode: "A",
        date: "2026-07-12",
        avgPrice: 30,
        volume: 1,
      },
      {
        cropName: "高麗菜",
        cropCode: "A",
        date: "2026-07-14",
        avgPrice: 33,
        volume: 1,
      },
      {
        cropName: "其他",
        cropCode: "X",
        date: "2026-07-14",
        avgPrice: 99,
        volume: 9999,
      },
    ]);
    const changes = cropChangesFromNationalSeries(series);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].cropName, "高麗菜");
    assert.equal(changes[0].latestDate, "2026-07-14");
    assert.equal(changes[0].previousDate, "2026-07-12");
    assert.equal(changes[0].priceChange, 10);
  });

  it("allows previous day with price only (no volume gate)", () => {
    const series = buildCropNationalPriceSeries([
      { cropName: "番茄", date: "2026-07-10", avgPrice: 40, volume: 0 },
      { cropName: "番茄", date: "2026-07-14", avgPrice: 50, volume: 10 },
    ]);
    const changes = cropChangesFromNationalSeries(series);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].priceChange, 25);
  });

  it("excludes -其他 catch-all grades", () => {
    const series = buildCropNationalPriceSeries([
      { cropName: "甘藍-其他", date: "2026-07-12", avgPrice: 14 },
      { cropName: "甘藍-其他", date: "2026-07-14", avgPrice: 31 },
    ]);
    const changes = cropChangesFromNationalSeries(series);
    assert.equal(changes.length, 0);
  });
});
