import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMPACT_PRICE_KEYS,
  fromCompactPricePayload,
  isCompactPricePayload,
  toCompactPricePayload,
  type EncodablePriceRecord,
} from "./priceDto.ts";

const record = (
  overrides: Partial<EncodablePriceRecord> = {},
): EncodablePriceRecord => ({
  cropCode: "LA1",
  cropName: "甘藍",
  marketName: "台北一",
  grade: "上",
  upperPrice: 30,
  middlePrice: 22,
  lowerPrice: 15,
  avgPrice: 22.5,
  transWeight: 12345,
  date: "2026-07-17",
  priceChange: 8.4,
  ...overrides,
});

describe("compact price DTO contract", () => {
  // Guards the exact wire contract: dropping or reordering a column silently
  // feeds the search page `undefined`, which is how priceChange became 0.
  it("declares every field the search page reads, in a fixed order", () => {
    assert.deepEqual(
      [...COMPACT_PRICE_KEYS],
      [
        "cropCode",
        "cropName",
        "marketName",
        "grade",
        "upperPrice",
        "middlePrice",
        "lowerPrice",
        "avgPrice",
        "transWeight",
        "date",
        "priceChange",
      ],
    );
  });

  it("includes priceChange in the payload keys", () => {
    const payload = toCompactPricePayload([record()]);
    assert.ok(payload.keys.includes("priceChange"));
  });

  it("puts each value at the index its key declares", () => {
    const payload = toCompactPricePayload([record()]);
    const row = payload.data[0];
    assert.equal(payload.keys.length, row.length);
    assert.equal(row[payload.keys.indexOf("priceChange")], 8.4);
    assert.equal(row[payload.keys.indexOf("cropName")], "甘藍");
    assert.equal(row[payload.keys.indexOf("avgPrice")], 22.5);
    assert.equal(row[payload.keys.indexOf("date")], "2026-07-17");
  });
});

describe("toCompactPricePayload", () => {
  it("rounds prices and priceChange to one decimal, volume to an integer", () => {
    const payload = toCompactPricePayload([
      record({
        upperPrice: 30.06,
        middlePrice: 22.44,
        lowerPrice: 15.05,
        avgPrice: 22.449,
        transWeight: 12345.7,
        priceChange: -3.267,
      }),
    ]);
    const [row] = payload.data;
    const at = (key: string) => row[payload.keys.indexOf(key)];
    assert.equal(at("upperPrice"), 30.1);
    assert.equal(at("middlePrice"), 22.4);
    assert.equal(at("lowerPrice"), 15.1);
    assert.equal(at("avgPrice"), 22.4);
    assert.equal(at("transWeight"), 12346);
    assert.equal(at("priceChange"), -3.3);
  });

  it("keeps a negative priceChange negative", () => {
    const payload = toCompactPricePayload([record({ priceChange: -12.5 })]);
    assert.equal(payload.data[0][payload.keys.indexOf("priceChange")], -12.5);
  });

  it("emits 0 rather than undefined when a record has no priceChange", () => {
    const { priceChange: _omitted, ...withoutChange } = record();
    const payload = toCompactPricePayload([withoutChange]);
    const value = payload.data[0][payload.keys.indexOf("priceChange")];
    assert.equal(value, 0);
    assert.equal(typeof value, "number");
  });

  it("degrades non-finite numbers to 0 instead of NaN", () => {
    const payload = toCompactPricePayload([
      record({ avgPrice: Number.NaN, priceChange: Number.POSITIVE_INFINITY }),
    ]);
    const [row] = payload.data;
    assert.equal(row[payload.keys.indexOf("avgPrice")], 0);
    assert.equal(row[payload.keys.indexOf("priceChange")], 0);
  });

  it("emits an empty string for a missing grade", () => {
    const { grade: _omitted, ...withoutGrade } = record();
    const payload = toCompactPricePayload([withoutGrade]);
    assert.equal(payload.data[0][payload.keys.indexOf("grade")], "");
  });
});

describe("fromCompactPricePayload", () => {
  it("round-trips a record, priceChange included", () => {
    const original = record({ priceChange: -4.2 });
    const [decoded] = fromCompactPricePayload(
      toCompactPricePayload([original]),
    );
    assert.equal(decoded.priceChange, -4.2);
    assert.equal(decoded.cropCode, "LA1");
    assert.equal(decoded.cropName, "甘藍");
    assert.equal(decoded.marketName, "台北一");
    assert.equal(decoded.avgPrice, 22.5);
    assert.equal(decoded.transWeight, 12345);
    assert.equal(decoded.date, "2026-07-17");
  });

  it("survives a JSON round trip, the way the browser receives it", () => {
    const payload = JSON.parse(
      JSON.stringify(toCompactPricePayload([record({ priceChange: 15.9 })])),
    );
    assert.equal(fromCompactPricePayload(payload)[0].priceChange, 15.9);
  });

  it("preserves the sort order the search page depends on", () => {
    const payload = toCompactPricePayload([
      record({ cropName: "甘藍", priceChange: -6 }),
      record({ cropName: "青蔥", priceChange: 12 }),
      record({ cropName: "蘿蔔", priceChange: 3 }),
    ]);
    const sorted = fromCompactPricePayload(payload).toSorted(
      (a, b) => (b.priceChange ?? 0) - (a.priceChange ?? 0),
    );
    assert.deepEqual(
      sorted.map((r) => r.cropName),
      ["青蔥", "蘿蔔", "甘藍"],
    );
  });

  it("decodes against the payload's own keys, not the local contract", () => {
    const decoded = fromCompactPricePayload({
      keys: ["cropName", "priceChange"],
      data: [["高麗菜", 7.5]],
    });
    assert.equal(decoded[0].cropName, "高麗菜");
    assert.equal(decoded[0].priceChange, 7.5);
  });

  it("returns an empty list for a malformed payload", () => {
    assert.deepEqual(fromCompactPricePayload(null), []);
    assert.deepEqual(fromCompactPricePayload(undefined), []);
    assert.deepEqual(fromCompactPricePayload({ data: [] }), []);
    assert.deepEqual(fromCompactPricePayload({ keys: [] }), []);
  });
});

describe("isCompactPricePayload", () => {
  it("distinguishes the compact payload from a plain record array", () => {
    assert.equal(isCompactPricePayload(toCompactPricePayload([record()])), true);
    assert.equal(isCompactPricePayload([record()]), false);
    assert.equal(isCompactPricePayload({ data: [record()] }), false);
    assert.equal(isCompactPricePayload(null), false);
  });
});
