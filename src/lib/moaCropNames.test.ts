import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasMoaCropRule,
  matchesMoaCrop,
  matchesSearchKeyword,
  moaQueryName,
  moaSearchTerms,
  selectMoaCropRows,
  siteCropForMoaName,
} from "./moaCropNames.ts";

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

describe("siteCropForMoaName", () => {
  it("maps whole-crop MOA names back to the colloquial page name", () => {
    assert.equal(siteCropForMoaName("甘藍"), "高麗菜");
    assert.equal(siteCropForMoaName("番石榴"), "芭樂");
    assert.equal(siteCropForMoaName("薑"), "薑");
    assert.equal(siteCropForMoaName("番茄"), "番茄");
    assert.equal(siteCropForMoaName("紅龍果"), "火龍果");
    assert.equal(siteCropForMoaName("青花苔"), "青花菜");
  });

  it("never lets a search-only alias take over a crop that has its own page", () => {
    // 紅蘿蔔 / 長豆 are search aliases; 胡蘿蔔 / 菜豆 are curated pages.
    assert.equal(siteCropForMoaName("胡蘿蔔"), "胡蘿蔔");
    assert.equal(siteCropForMoaName("菜豆"), "菜豆");
    assert.equal(siteCropForMoaName("甘薯"), "甘薯");
  });
});

describe("site crop pages with renamed MOA 品名", () => {
  it("resolve to real rows", () => {
    assert.equal(matchesMoaCrop("白菜", "包心白-包白"), true);
    assert.equal(matchesMoaCrop("白菜", "包心白菜-進口 包頭蓮"), true);
    assert.equal(matchesMoaCrop("白菜", "小白菜-蚵仔白"), false);
    assert.equal(matchesMoaCrop("青花菜", "青花苔"), true);
    assert.equal(matchesMoaCrop("山藥", "薯蕷-白薯蕷 人參"), true);
    assert.equal(matchesMoaCrop("山藥", "薯蕷-樹薯"), false);
    assert.equal(matchesMoaCrop("豇豆", "菜豆-青色"), true);
    assert.equal(matchesMoaCrop("火龍果", "紅龍果-紅肉"), true);
    assert.equal(matchesMoaCrop("橘子", "茂谷柑"), true);
  });
});

describe("matchesSearchKeyword", () => {
  it("finds MOA rows for colloquial keywords", () => {
    assert.equal(matchesSearchKeyword("高麗菜", "甘藍-初秋"), true);
    assert.equal(matchesSearchKeyword("紅蘿蔔", "胡蘿蔔-清洗"), true);
    assert.equal(matchesSearchKeyword("大陸妹", "萵苣菜-本島圓葉"), true);
    assert.equal(matchesSearchKeyword("彩椒", "甜椒-彩色種 紅色"), true);
    assert.equal(matchesSearchKeyword("彩椒", "甜椒-青椒"), false);
    assert.equal(matchesSearchKeyword("梨子", "梨-新興梨"), true);
  });

  it("keeps the plain substring behaviour", () => {
    assert.equal(matchesSearchKeyword("白菜", "小白菜-蚵仔白"), true);
    assert.equal(matchesSearchKeyword("白菜", "包心白-包白"), true);
    assert.equal(matchesSearchKeyword("蔥", "洋蔥-本產"), true);
    // Both readings of 龍鬚菜 stay visible in search.
    assert.equal(matchesSearchKeyword("龍鬚菜", "海菜-龍鬚菜"), true);
    assert.equal(matchesSearchKeyword("龍鬚菜", "隼人瓜-瓜苗"), true);
    assert.equal(matchesSearchKeyword("番茄", "甘藍-初秋"), false);
    assert.equal(matchesSearchKeyword("", "甘藍-初秋"), true);
  });
});

describe("moaSearchTerms", () => {
  it("adds alias bases the keyword doesn't already cover", () => {
    assert.deepEqual(moaSearchTerms("高麗菜"), ["高麗菜", "甘藍"]);
    assert.deepEqual(moaSearchTerms("白菜"), ["白菜", "包心白"]);
    assert.deepEqual(moaSearchTerms("橘子"), ["橘子", "椪柑", "柑橘", "桶柑", "茂谷柑"]);
    assert.deepEqual(moaSearchTerms("番茄"), ["番茄"]);
  });
});
