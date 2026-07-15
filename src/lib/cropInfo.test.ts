import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cropBaseName, getCropBaseInfo, hasCropBaseInfo } from "./cropInfo.ts";

describe("cropBaseName", () => {
  it("strips MOA grade suffix after first dash", () => {
    assert.equal(cropBaseName("甘藍-改良種"), "甘藍");
    assert.equal(cropBaseName("芒果"), "芒果");
  });
});

describe("getCropBaseInfo", () => {
  it("matches MOA base names used in wholesale data", () => {
    const cabbage = getCropBaseInfo("甘藍-改良種");
    assert.ok(cabbage);
    assert.match(cabbage!.feature, /結球|葉/);
    assert.ok(cabbage!.season.length > 0);
    assert.ok(cabbage!.staticOrigin.length > 0);
  });

  it("resolves common aliases (高麗菜 → 甘藍 content)", () => {
    const a = getCropBaseInfo("高麗菜");
    const b = getCropBaseInfo("甘藍");
    assert.ok(a && b);
    assert.equal(a!.feature, b!.feature);
  });

  it("returns null for unknown / misc names without inventing defaults", () => {
    assert.equal(getCropBaseInfo(""), null);
    assert.equal(getCropBaseInfo("完全不存在的作物XYZ"), null);
    assert.equal(hasCropBaseInfo("完全不存在的作物XYZ"), false);
  });

  it("covers high-frequency MOA bases", () => {
    for (const name of ["南瓜", "萵苣菜", "紅龍果", "蕹菜", "杏鮑菇", "番石榴"]) {
      assert.ok(getCropBaseInfo(name), `expected entry for ${name}`);
    }
  });
});
