import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getProduceCategory } from "./produceCategory.ts";

describe("getProduceCategory with MOA type code", () => {
  it("classifies an N06 record as flower even when the name has no flower keyword", () => {
    // 康乃馨 contains none of the flower keywords (花/菊/玫瑰/百合/蘭),
    // so name-only classification wrongly falls through to 'vegetable'.
    // The MOA 種類代碼 N06 is authoritative and must win.
    assert.equal(getProduceCategory("康乃馨", "N06"), "flower");
  });

  it("classifies an N05 record as fruit even when the name has no fruit keyword", () => {
    // 蓮霧 has no fruit keyword, so name-only classification defaults to vegetable.
    assert.equal(getProduceCategory("蓮霧", "N05"), "fruit");
  });

  it("keeps N04 as vegetable even when the name matches another category's keyword", () => {
    // 花胡瓜 is an N04 vegetable but contains 花, which name-only logic reads as flower.
    assert.equal(getProduceCategory("花胡瓜", "N04"), "vegetable");
  });

  it("splits N04 into mushroom when a mushroom keyword is present", () => {
    // 菇類 are filed under N04 by MOA; the app surfaces them as their own category.
    assert.equal(getProduceCategory("香菇", "N04"), "mushroom");
    assert.equal(getProduceCategory("金針菇", "N04"), "mushroom");
  });

  it("falls back to keyword matching when the type code is empty or unknown", () => {
    assert.equal(getProduceCategory("蓮霧", ""), "vegetable"); // no signal → name-only default
    assert.equal(getProduceCategory("蓮霧", "N99"), "vegetable"); // unknown code → name-only
  });
});

describe("getProduceCategory without a type code (name-only, unchanged behavior)", () => {
  it("matches the established keyword categories", () => {
    assert.equal(getProduceCategory("高麗菜"), "vegetable");
    assert.equal(getProduceCategory("香蕉"), "fruit");
    assert.equal(getProduceCategory("香菇"), "mushroom");
    assert.equal(getProduceCategory("玫瑰"), "flower");
  });
});
