import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMarketOverviewTrendPoints,
  getMarketOverviewScopeLabel,
  overviewFromSeries,
  toHistoryPoints,
  type TradingDayPoint,
} from "./marketOverviewCore.ts";

describe("getMarketOverviewScopeLabel", () => {
  it("uses National Overview for aggregate and meat scopes", () => {
    assert.equal(
      getMarketOverviewScopeLabel("vegetable", "全部市場"),
      "全國概況",
    );
    assert.equal(
      getMarketOverviewScopeLabel("fruit", "全國平均"),
      "全國概況",
    );
    assert.equal(
      getMarketOverviewScopeLabel("meat", "台北一"),
      "全國概況",
    );
  });

  it("keeps a named market label for a named produce scope", () => {
    assert.equal(
      getMarketOverviewScopeLabel("vegetable", "台北一"),
      "台北一",
    );
  });
});

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

describe("toHistoryPoints", () => {
  it("preserves the production closed-day state for homepage charts", () => {
    assert.deepEqual(
      toHistoryPoints([
        {
          date: "2026-07-14",
          label: "07/14",
          avgPrice: null,
          volume: null,
          isClosed: true,
        },
      ]),
      [
        {
          date: "2026-07-14",
          label: "07/14",
          avgPrice: null,
          volume: null,
          isClosed: true,
        },
      ],
    );
  });
});

describe("buildMarketOverviewTrendPoints", () => {
  it("marks missing dates closed while keeping trading dates open", () => {
    const points = buildMarketOverviewTrendPoints(
      ["2026-07-14", "2026-07-15", "2026-07-16"],
      new Map([
        ["2026-07-14", { avgPrice: 46.1, volume: 172000 }],
        ["2026-07-16", { avgPrice: 47.2, volume: 181000 }],
      ]),
      (date) => date.slice(5).replace("-", "/"),
    );

    assert.deepEqual(points, [
      {
        date: "2026-07-14",
        label: "07/14",
        avgPrice: 46.1,
        volume: 172000,
        isClosed: false,
      },
      {
        date: "2026-07-15",
        label: "07/15",
        avgPrice: null,
        volume: null,
        isClosed: true,
      },
      {
        date: "2026-07-16",
        label: "07/16",
        avgPrice: 47.2,
        volume: 181000,
        isClosed: false,
      },
    ]);
  });
});
