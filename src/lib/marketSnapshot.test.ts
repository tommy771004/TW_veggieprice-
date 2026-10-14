import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMarketSnapshot, topMovers, type DailyRow } from "./marketSnapshot.ts";

const row = (CropName: string, MarketName: string, Avg_Price: number, Trans_Quantity: number, TcType = "N04"): DailyRow =>
  ({ CropName, MarketName, Avg_Price, Trans_Quantity, TcType });

describe("buildMarketSnapshot", () => {
  const days: Array<[string, DailyRow[]]> = [
    ["2026-10-14", [row("休市", "西螺鎮", 0, 0)]],
    ["2026-10-13", [
      row("甘藍-初秋", "西螺鎮", 30, 3000),
      row("甘藍-改良種", "西螺鎮", 20, 1000),
      row("番茄-牛番茄", "西螺鎮", 100, 500),
      row("甘藍-初秋", "台北一", 99, 9999),
      row("玫瑰", "西螺鎮", 50, 100, "N06"),
      row("其他", "西螺鎮", 40, 800),
    ]],
    ["2026-10-12", []],
    ["2026-10-11", [row("甘藍-初秋", "西螺鎮", 25, 2000)]],
  ];

  it("uses the market's latest trading day and merges varieties volume-weighted", () => {
    const snap = buildMarketSnapshot("西螺鎮", days)!;
    assert.equal(snap.date, "2026-10-13");
    assert.equal(snap.prevDate, "2026-10-11");
    assert.deepEqual(snap.items.map((i) => i.name), ["甘藍", "番茄"]);
    assert.equal(snap.items[0].avgPrice, 27.5);
    assert.equal(snap.items[0].volume, 4000);
    assert.equal(snap.items[0].changePct, 10);
    assert.equal(snap.items[1].changePct, null);
    assert.equal(snap.totalVolume, 4500);
  });

  it("returns null when the market never traded in the window", () => {
    assert.equal(buildMarketSnapshot("花蓮市", days), null);
  });
});

describe("topMovers", () => {
  it("ranks risers and fallers, skipping thin trades", () => {
    const items = [
      { name: "A", avgPrice: 1, volume: 5000, changePct: 20 },
      { name: "B", avgPrice: 1, volume: 5000, changePct: -30 },
      { name: "C", avgPrice: 1, volume: 50, changePct: 300 },
      { name: "D", avgPrice: 1, volume: 5000, changePct: null },
    ];
    const { up, down } = topMovers(items);
    assert.deepEqual(up.map((i) => i.name), ["A"]);
    assert.deepEqual(down.map((i) => i.name), ["B"]);
  });
});
