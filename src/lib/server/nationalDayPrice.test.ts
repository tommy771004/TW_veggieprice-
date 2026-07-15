import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCropNationalPriceSeries,
  cropChangesFromNationalSeries,
  nationalDayMeanAvgPrice,
} from "./nationalDayPrice.ts";

describe("nationalDayMeanAvgPrice", () => {
  it("simple-means market avg prices and ignores volume", () => {
    const p = nationalDayMeanAvgPrice([
      { avgPrice: 10 },
      { avgPrice: 30 },
    ]);
    assert.ok(p);
    assert.equal(p!.price, 20);
    assert.equal(p!.marketCount, 2);
  });
});

describe("cropChangesFromNationalSeries", () => {
  it("compares mean avg on latest day vs previous day", () => {
    const series = buildCropNationalPriceSeries([
      { cropName: "高麗菜", cropCode: "A", date: "2026-07-12", avgPrice: 20 },
      { cropName: "高麗菜", cropCode: "A", date: "2026-07-12", avgPrice: 30 },
      { cropName: "高麗菜", cropCode: "A", date: "2026-07-14", avgPrice: 33 },
      { cropName: "高麗菜", cropCode: "A", date: "2026-07-14", avgPrice: 27 },
      { cropName: "其他", date: "2026-07-14", avgPrice: 99 },
    ]);
    // day12 mean=25, day14 mean=30 → +20%
    const changes = cropChangesFromNationalSeries(series);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].cropName, "高麗菜");
    assert.equal(changes[0].previousPrice, 25);
    assert.equal(changes[0].latestPrice, 30);
    assert.equal(changes[0].priceChange, 20);
  });

  it("excludes -其他 catch-all grades", () => {
    const series = buildCropNationalPriceSeries([
      { cropName: "甘藍-其他", date: "2026-07-12", avgPrice: 14 },
      { cropName: "甘藍-其他", date: "2026-07-14", avgPrice: 31 },
    ]);
    assert.equal(cropChangesFromNationalSeries(series).length, 0);
  });
});
