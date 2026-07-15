import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildInterpolatedHistory } from "./historyAggregation.ts";

describe("buildInterpolatedHistory", () => {
  it("scheme C: multi-market day uses mean of upper / avg / lower", () => {
    const { data, closedDays } = buildInterpolatedHistory({
      records: [
        {
          date: "2026-07-14",
          avgPrice: 30,
          upperPrice: 40,
          lowerPrice: 20,
          transWeight: 100,
        },
        {
          date: "2026-07-14",
          avgPrice: 20,
          upperPrice: 30,
          lowerPrice: 10,
          transWeight: 50,
        },
      ],
      dates: ["2026-07-14"],
      labelForDate: (d) => d,
    });

    assert.equal(closedDays.length, 0);
    assert.equal(data.length, 1);
    // mean avg = 25, mean upper = 35, mean lower = 15 (not max 40 / min 10)
    assert.equal(data[0].avgPrice, 25);
    assert.equal(data[0].upperPrice, 35);
    assert.equal(data[0].lowerPrice, 15);
    assert.equal(data[0].volume, 150);
    assert.equal(data[0].isClosed, false);
  });

  it("scheme B: single-market day keeps that market's own U/A/L", () => {
    const { data } = buildInterpolatedHistory({
      records: [
        {
          date: "2026-07-14",
          avgPrice: 32.4,
          upperPrice: 38,
          lowerPrice: 28,
          transWeight: 55757,
        },
      ],
      dates: ["2026-07-14"],
      labelForDate: (d) => d,
    });

    assert.equal(data[0].avgPrice, 32.4);
    assert.equal(data[0].upperPrice, 38);
    assert.equal(data[0].lowerPrice, 28);
  });

  it("marks empty days closed and interpolates between neighbors", () => {
    const { data, closedDays } = buildInterpolatedHistory({
      records: [
        {
          date: "2026-07-12",
          avgPrice: 10,
          upperPrice: 12,
          lowerPrice: 8,
          transWeight: 1,
        },
        {
          date: "2026-07-14",
          avgPrice: 20,
          upperPrice: 24,
          lowerPrice: 16,
          transWeight: 1,
        },
      ],
      dates: ["2026-07-12", "2026-07-13", "2026-07-14"],
      labelForDate: (d) => d,
    });

    assert.deepEqual(closedDays, ["2026-07-13"]);
    assert.equal(data[1].isClosed, true);
    assert.equal(data[1].avgPrice, 15);
    assert.equal(data[1].upperPrice, 18);
    assert.equal(data[1].lowerPrice, 12);
  });
});
