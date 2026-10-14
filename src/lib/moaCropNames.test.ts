import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasMoaCropRule, matchesMoaCrop, moaQueryName, selectMoaCropRows } from "./moaCropNames.ts";

describe("matchesMoaCrop", () => {
  it("maps colloquial names to MOA 品名 varieties", () => {
    assert.equal(matchesMoaCrop("高麗菜", "甘藍-初秋"), true);
    assert.equal(matchesMoaCrop("高麗菜", "球莖甘藍"), false);
    assert.equal(matchesMoaCrop("文旦", "柚子-文旦"), true);
    assert.equal(matchesMoaCrop("文旦", "柚子-白柚"), false);
    assert.equal(matchesMoaCrop("芭樂", "番石榴-珍珠芭"), true);
  });

  it("defaults to exact name or `name-` prefix", () => {
    assert.equal(matchesMoaCrop("香蕉", "香蕉"), true);
    assert.equal(matchesMoaCrop("番茄", "番茄-牛番茄"), true);
    assert.equal(matchesMoaCrop("番茄", "小番茄"), false);
    assert.equal(matchesMoaCrop("甘藍-初秋", "甘藍-初秋"), true);
  });

  it("drops substring false positives and curated exclusions", () => {
    assert.equal(matchesMoaCrop("薑", "薑-老薑"), true);
    assert.equal(matchesMoaCrop("薑", "紅薑花"), false);
    assert.equal(matchesMoaCrop("薑", "薑-薑黃"), false);
    assert.equal(matchesMoaCrop("白蘿蔔", "蘿蔔-白玉蘿蔔"), true);
    assert.equal(matchesMoaCrop("白蘿蔔", "蘿蔔-甜菜根"), false);
    assert.equal(matchesMoaCrop("白蘿蔔", "胡蘿蔔-清洗"), false);
  });
});

describe("moaQueryName", () => {
  it("sends the base 品名 for mapped crops and the name itself otherwise", () => {
    assert.equal(moaQueryName("高麗菜"), "甘藍");
    assert.equal(moaQueryName("柳橙"), "甜橙");
    assert.equal(moaQueryName("番茄"), "番茄");
    assert.equal(hasMoaCropRule("高麗菜"), true);
    assert.equal(hasMoaCropRule("番茄"), false);
  });
});

describe("selectMoaCropRows", () => {
  const rows = ["香蕉", "香蕉-芭蕉紅芭蕉", "甘藍-初秋", "甘藍-改良種", "球莖甘藍"].map((n) => ({ n }));
  const names = (cropName: string) => selectMoaCropRows(cropName, rows, (r) => r.n).map((r) => r.n);

  it("prefers exact 品名 rows when present", () => {
    assert.deepEqual(names("香蕉"), ["香蕉"]);
  });

  it("falls back to variety / alias rows otherwise", () => {
    assert.deepEqual(names("高麗菜"), ["甘藍-初秋", "甘藍-改良種"]);
    assert.deepEqual(names("甘藍"), ["甘藍-初秋", "甘藍-改良種"]);
  });
});
