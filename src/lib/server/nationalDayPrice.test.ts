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
    assert.ok(p);
    assert.equal(p!.price, 15);
    assert.equal(p!.volume, 200);
  });

  it("simple-means when no volume", () => {
    const p = nationalDayUnitPrice([
      { avgPrice: 10, volume: 0 },
      { avgPrice: 20 },
    ]);
    assert.ok(p);
    assert.equal(p!.price, 15);
  });
});

describe("cropChangesFromNationalSeries", () => {
  it("compares latest reliable day to previous reliable day", () => {
    const series = buildCropNationalPriceSeries([
      {
        cropName: "高麗菜",
        cropCode: "A",
        date: "2026-07-10",
        avgPrice: 20,
        volume: 500,
      },
      {
        cropName: "高麗菜",
        cropCode: "A",
        date: "2026-07-12",
        avgPrice: 30,
        volume: 500,
      },
      {
        cropName: "高麗菜",
        cropCode: "A",
        date: "2026-07-14",
        avgPrice: 33,
        volume: 500,
      },
      {
        cropName: "其他",
        cropCode: "X",
        date: "2026-07-14",
        avgPrice: 99,
        volume: 9999,
      },
    ]);
    const changes = cropChangesFromNationalSeries(series, {
      minDayVolume: 100,
    });
    assert.equal(changes.length, 1);
    assert.equal(changes[0].cropName, "高麗菜");
    assert.equal(changes[0].latestDate, "2026-07-14");
    assert.equal(changes[0].previousDate, "2026-07-12");
    assert.equal(changes[0].priceChange, 10);
  });

  it("skips thin-volume days so they do not become a false baseline", () => {
    const series = buildCropNationalPriceSeries([
      // thin day — must not be previous baseline
      { cropName: "芫荽", date: "2026-07-13", avgPrice: 16, volume: 27 },
      { cropName: "芫荽", date: "2026-07-12", avgPrice: 40, volume: 2000 },
      { cropName: "芫荽", date: "2026-07-14", avgPrice: 144, volume: 3500 },
    ]);
    const changes = cropChangesFromNationalSeries(series, {
      minDayVolume: 100,
    });
    assert.equal(changes.length, 1);
    assert.equal(changes[0].previousDate, "2026-07-12");
    assert.equal(changes[0].latestDate, "2026-07-14");
    // 144 vs 40 = +260%, not 144 vs 16 = +800%
    assert.ok(changes[0].priceChange < 300);
    assert.ok(changes[0].priceChange > 200);
  });

  it("excludes -其他 catch-all grades", () => {
    const series = buildCropNationalPriceSeries([
      { cropName: "甘藍-其他", date: "2026-07-12", avgPrice: 14, volume: 3000 },
      { cropName: "甘藍-其他", date: "2026-07-14", avgPrice: 31, volume: 3000 },
    ]);
    const changes = cropChangesFromNationalSeries(series, {
      minDayVolume: 100,
    });
    assert.equal(changes.length, 0);
  });
});
