import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProduceMeta } from "./produceSeo.ts";
import { getCropAliases, isCatalogPrimaryName } from "./cropInfo.ts";

const today = "2026-10-12";

describe("buildProduceMeta", () => {
  it("puts latest price, date and day-over-day change in the snippet", () => {
    const meta = buildProduceMeta({
      cropName: "高麗菜",
      history: [
        { date: "2026-10-10", avgPrice: 25 },
        { date: "2026-10-11", avgPrice: null },
        { date: "2026-10-12", avgPrice: 27.5 },
      ],
      aliases: [],
      aliasInTitle: false,
      today,
    });
    assert.equal(meta.title, "高麗菜價格今日行情 27.5元/公斤（10/12）");
    assert.match(meta.description, /每公斤 27\.5 元（10\/12），較前一交易日上漲 10%/);
  });

  it("shows the colloquial alias in the title only for formal MOA names", () => {
    const formal = buildProduceMeta({
      cropName: "扁蒲",
      history: [{ date: today, avgPrice: 30 }],
      aliases: ["蒲瓜", "瓠瓜"],
      aliasInTitle: true,
      today,
    });
    assert.ok(formal.title.startsWith("扁蒲（蒲瓜）價格今日行情"));
    assert.ok(formal.description.startsWith("扁蒲（又稱蒲瓜、瓠瓜）"));

    const colloquial = buildProduceMeta({
      cropName: "高麗菜",
      history: [{ date: today, avgPrice: 30 }],
      aliases: ["甘藍", "捲心菜"],
      aliasInTitle: false,
      today,
    });
    assert.ok(colloquial.title.startsWith("高麗菜價格今日行情"));
  });

  it("falls back to generic copy when there is no recent price", () => {
    for (const history of [[], [{ date: "2026-09-01", avgPrice: 40 }]]) {
      const meta = buildProduceMeta({ cropName: "薑", history, aliases: [], aliasInTitle: false, today });
      assert.equal(meta.title, "薑價格今日行情・批發價與歷史走勢");
      assert.doesNotMatch(meta.description, /元（/);
    }
  });
});

describe("getCropAliases", () => {
  it("returns the catalog name and siblings, excluding the input", () => {
    assert.deepEqual(getCropAliases("扁蒲"), ["蒲瓜", "瓠瓜"]);
    assert.deepEqual(getCropAliases("高麗菜"), ["甘藍", "捲心菜"]);
    assert.deepEqual(getCropAliases("不存在的作物"), []);
  });

  it("distinguishes formal names from aliases", () => {
    assert.equal(isCatalogPrimaryName("扁蒲"), true);
    assert.equal(isCatalogPrimaryName("高麗菜"), false);
  });
});
