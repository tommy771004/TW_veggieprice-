import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAggregateMarket } from "./constants.ts";
import { marketsMatch, resolveMarketInList } from "./markets.ts";

describe("isAggregateMarket", () => {
  it("recognizes both aggregate market labels", () => {
    assert.equal(isAggregateMarket("全部市場"), true);
    assert.equal(isAggregateMarket("全國平均"), true);
  });

  it("keeps physical markets eligible for weather data", () => {
    assert.equal(isAggregateMarket("台北一"), false);
  });
});

describe("marketsMatch", () => {
  it("matches exact names", () => {
    assert.equal(marketsMatch("台北一", "台北一"), true);
  });

  it("maps vegetable 台北一 to seafood 台北", () => {
    assert.equal(marketsMatch("台北一", "台北"), true);
    assert.equal(marketsMatch("台北", "台北一"), true);
  });

  it("does not collapse 台北一 with 台北二", () => {
    assert.equal(marketsMatch("台北一", "台北二"), false);
  });

  it("strips 市/區 suffixes", () => {
    assert.equal(marketsMatch("台中市", "台中"), true);
    assert.equal(marketsMatch("高雄市", "高雄"), true);
  });
});

describe("resolveMarketInList", () => {
  const seafood = ["台北", "台中", "高雄", "基隆"];

  it("keeps exact membership", () => {
    assert.equal(resolveMarketInList("台中", seafood), "台中");
  });

  it("maps 台北一 onto seafood 台北", () => {
    assert.equal(resolveMarketInList("台北一", seafood), "台北");
  });

  it("prefers preferred when current missing", () => {
    assert.equal(resolveMarketInList("屏東市", seafood, "高雄"), "高雄");
  });

  it("falls back to first entry", () => {
    assert.equal(resolveMarketInList("未知市場", ["甲", "乙"]), "甲");
  });
});
