import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  overviewFromSeries,
  type TradingDayPoint,
} from "./marketOverviewCore.ts";

describe("overviewFromSeries", () => {
  it("uses latest and previous non-null trading days", () => {
    const points: TradingDayPoint[] = [
      { date: "2026-07-01", avgPrice: 100, volume: 1000 },
      { date: "2026-07-02", avgPrice: null, volume: null },
      { date: "2026-07-03", avgPrice: 110, volume: 2000 },
    ];
    const ov = overviewFromSeries(points, "台北一", "2026-07-14T00:00:00.000Z");
    assert.ok(ov);
    assert.equal(ov!.date, "2026-07-03");
    assert.equal(ov!.avgPrice, 110);
    assert.equal(ov!.totalVolume, 2000);
    assert.equal(ov!.priceChange, 10);
    assert.equal(ov!.volumeChange, 100);
    assert.equal(ov!.marketName, "台北一");
  });

  it("returns null when no trading days", () => {
    const points: TradingDayPoint[] = [
      { date: "2026-07-01", avgPrice: null, volume: null },
    ];
    assert.equal(overviewFromSeries(points, "台北一"), null);
  });

  it("zero change when only one trading day", () => {
    const points: TradingDayPoint[] = [
      { date: "2026-07-08", avgPrice: 180.1, volume: 62944.7 },
    ];
    const ov = overviewFromSeries(points, "台北一");
    assert.ok(ov);
    assert.equal(ov!.priceChange, 0);
    assert.equal(ov!.volumeChange, 0);
    assert.equal(ov!.avgPrice, 180.1);
    assert.equal(ov!.totalVolume, 62945);
  });
});
