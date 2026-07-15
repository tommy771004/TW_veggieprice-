import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCropNationalPriceSeries,
  cropChangesFromNationalSeries,
  nationalDayUnitPrice,
} from "./nationalDayPrice.ts";

describe("nationalDayUnitPrice", () => {
  it("volume-weights when volume present", () => {
    const p = nationalDayUnitPrice([
      { avgPrice: 10, volume: 100 },
      { avgPrice: 20, volume: 100 },
    ]);
    assert.equal(p, 15);
  });

  it("simple-means when no volume", () => {
    const p = nationalDayUnitPrice([
      { avgPrice: 10, volume: 0 },
      { avgPrice: 20 },
    ]);
    assert.equal(p, 15);
  });
});

describe("cropChangesFromNationalSeries", () => {
  it("compares latest priced day to previous priced day", () => {
    const series = buildCropNationalPriceSeries([
      { cropName: "高麗菜", cropCode: "A", date: "2026-07-10", avgPrice: 20, volume: 100 },
      { cropName: "高麗菜", cropCode: "A", date: "2026-07-12", avgPrice: 30, volume: 100 },
      { cropName: "高麗菜", cropCode: "A", date: "2026-07-14", avgPrice: 33, volume: 50 },
      { cropName: "其他", cropCode: "X", date: "2026-07-14", avgPrice: 99, volume: 9999 },
    ]);
    const changes = cropChangesFromNationalSeries(series);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].cropName, "高麗菜");
    assert.equal(changes[0].latestDate, "2026-07-14");
    assert.equal(changes[0].previousDate, "2026-07-12");
    assert.equal(changes[0].priceChange, 10); // 33 vs 30
  });

  it("allows previous day with price only (no volume)", () => {
    const series = buildCropNationalPriceSeries([
      { cropName: "番茄", date: "2026-07-10", avgPrice: 40 },
      { cropName: "番茄", date: "2026-07-14", avgPrice: 50, volume: 10 },
    ]);
    const changes = cropChangesFromNationalSeries(series);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].priceChange, 25);
  });
});
