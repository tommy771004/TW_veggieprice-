import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIVESTOCK_CROP_CODES,
  buildLivestockQuotes,
  buildSeafoodQuotes,
  type LivestockFeedTables,
  type SeafoodQuoteRow,
} from "./searchFeedRecords.ts";

const seafoodRow = (
  overrides: Partial<SeafoodQuoteRow> = {},
): SeafoodQuoteRow => ({
  交易日期: "1150821",
  品種代碼: 1011,
  魚貨名稱: "吳郭魚",
  市場名稱: "三重",
  上價: 80,
  中價: 67.4,
  下價: 41.7,
  交易量: 9819.2,
  平均價: 57.6,
  ...overrides,
});

const at = (quotes: ReturnType<typeof buildLivestockQuotes>, name: string, market: string) =>
  quotes.filter((q) => q.cropName === name && q.marketName === market);

describe("buildSeafoodQuotes", () => {
  it("keeps the row's real 交易日期 instead of stamping today", () => {
    const [quote] = buildSeafoodQuotes([seafoodRow()]);
    assert.equal(quote.date, "2026-08-21");
  });

  it("carries 品種代碼, 魚貨名稱 and 市場名稱 through", () => {
    const [quote] = buildSeafoodQuotes([seafoodRow()]);
    assert.equal(quote.cropCode, "1011");
    assert.equal(quote.cropName, "吳郭魚");
    assert.equal(quote.marketName, "三重");
    assert.equal(quote.avgPrice, 57.6);
    assert.equal(quote.transWeight, 9819.2);
  });

  it("keeps one quote per source row so days stay separable", () => {
    const quotes = buildSeafoodQuotes([
      seafoodRow({ 交易日期: "1150819" }),
      seafoodRow({ 交易日期: "1150820" }),
      seafoodRow({ 交易日期: "1150821" }),
    ]);
    assert.deepEqual(
      quotes.map((q) => q.date),
      ["2026-08-19", "2026-08-20", "2026-08-21"],
    );
  });

  it("falls back to 平均價 for a missing band", () => {
    const [quote] = buildSeafoodQuotes([
      seafoodRow({ 上價: undefined, 中價: undefined, 下價: undefined }),
    ]);
    assert.equal(quote.upperPrice, 57.6);
    assert.equal(quote.middlePrice, 57.6);
    assert.equal(quote.lowerPrice, 57.6);
  });

  it("drops rows with no date or no positive 平均價", () => {
    assert.deepEqual(buildSeafoodQuotes([seafoodRow({ 交易日期: "" })]), []);
    assert.deepEqual(buildSeafoodQuotes([seafoodRow({ 平均價: 0 })]), []);
    assert.deepEqual(buildSeafoodQuotes([seafoodRow({ 平均價: "休市" })]), []);
  });
});

describe("buildLivestockQuotes — dates", () => {
  it("reads compact ROC dates from 毛豬", () => {
    const quotes = buildLivestockQuotes({
      pork: [
        {
          TransDate: "1150822",
          MarketName: "花蓮縣",
          TransNum_Total: 349,
          TransNum_AvgPrice: 103.73,
        },
      ],
    });
    assert.equal(at(quotes, "毛豬", "花蓮縣")[0].date, "2026-08-22");
  });

  it("reads AD slash dates from 羊 without shifting the year", () => {
    const quotes = buildLivestockQuotes({
      sheep: [
        {
          transDate: "2026/05/29",
          name: "雲林縣肉品市場",
          avgPrice: "252",
          quantity: "33",
        },
      ],
    });
    // rocToISO would read 2026 as a ROC year and land in 3937.
    assert.equal(at(quotes, "羊", "雲林縣肉品市場")[0].date, "2026-05-29");
  });

  it("reads AD slash dates from the poultry tables", () => {
    const quotes = buildLivestockQuotes({
      egg_chicken: [
        { TransDate: "2026/08/20", "TaijinPrice_2.0kgup": "34.0", egg_Price: "42.5" },
      ],
    });
    assert.equal(at(quotes, "雞蛋", "全國平均")[0].date, "2026-08-20");
  });
});

describe("buildLivestockQuotes — series", () => {
  const tables: LivestockFeedTables = {
    pork: [
      {
        TransDate: "1150822",
        MarketName: "花蓮縣",
        TransNum_Total: 100,
        TransNum_AvgPrice: 100,
      },
      {
        TransDate: "1150822",
        MarketName: "雲林縣",
        TransNum_Total: 900,
        TransNum_AvgPrice: 110,
      },
    ],
    sheep: [
      {
        transDate: "2026/08/21",
        name: "雲林縣肉品市場",
        avgPrice: "252",
        quantity: "33",
      },
    ],
    red_feather: [
      {
        TransDate: "2026/08/20",
        RedFeather_N_M: "46.0",
        RedFeather_N_F: "48.0",
        RedFeather_C_M: "47.0",
        RedFeather_C_F: "47.0",
        RedFeather_S_M: "50.0",
        RedFeather_S_F: "50.0",
      },
    ],
    egg_chicken: [
      { TransDate: "2026/08/20", "TaijinPrice_2.0kgup": "34.0", egg_Price: "42.5" },
    ],
    goose_duck: [
      {
        TransDate: "2026/08/20",
        Goose_WR_TaijinPrice: "67.0",
        Duck_75D_TaijinPrice: "52.8",
        Duck_M_TaijinPrice: "休市",
      },
    ],
  };

  it("volume-weights 毛豬 全國平均 the way the homepage does", () => {
    const [national] = at(buildLivestockQuotes(tables), "毛豬", "全國平均");
    // (100×100 + 110×900) / 1000 = 109, not the 105 a simple mean would give.
    assert.equal(national.avgPrice, 109);
    assert.equal(national.transWeight, 1000);
  });

  it("still emits each 毛豬 market on its own", () => {
    const quotes = buildLivestockQuotes(tables);
    assert.equal(at(quotes, "毛豬", "花蓮縣")[0].avgPrice, 100);
    assert.equal(at(quotes, "毛豬", "雲林縣")[0].avgPrice, 110);
  });

  it("splits 紅羽土雞 into its three regions plus a national quote", () => {
    const quotes = buildLivestockQuotes(tables);
    assert.equal(at(quotes, "紅羽土雞", "北部")[0].avgPrice, 47, "mean of 46 and 48");
    assert.equal(at(quotes, "紅羽土雞", "中部")[0].avgPrice, 47);
    assert.equal(at(quotes, "紅羽土雞", "南部")[0].avgPrice, 50);
    assert.equal(at(quotes, "紅羽土雞", "全國平均").length, 3);
  });

  it("emits the poultry items the national market carries", () => {
    const quotes = buildLivestockQuotes(tables);
    assert.equal(at(quotes, "白肉雞", "全國平均")[0].avgPrice, 34);
    assert.equal(at(quotes, "雞蛋", "全國平均")[0].avgPrice, 42.5);
    assert.equal(at(quotes, "肉鵝", "全國平均")[0].avgPrice, 67);
    assert.equal(at(quotes, "肉鴨", "全國平均")[0].avgPrice, 52.8);
  });

  it("gives every livestock item a distinct crop code", () => {
    const codes = Object.values(LIVESTOCK_CROP_CODES);
    assert.equal(new Set(codes).size, codes.length);

    // Sharing a code would merge two different animals at the same market,
    // because series are keyed by 品種代碼＋市場.
    const quotes = buildLivestockQuotes(tables);
    const pork = at(quotes, "毛豬", "全國平均")[0];
    const sheep = quotes.find((q) => q.cropName === "羊");
    assert.notEqual(pork.cropCode, sheep!.cropCode);
  });

  it("skips 休市 and other non-numeric quotes", () => {
    const quotes = buildLivestockQuotes({
      goose_duck: [
        {
          TransDate: "2026/08/20",
          Goose_WR_TaijinPrice: "休市",
          Duck_75D_TaijinPrice: "52.8",
        },
      ],
    });
    assert.equal(at(quotes, "肉鵝", "全國平均").length, 0);
    assert.equal(at(quotes, "肉鴨", "全國平均").length, 1);
  });

  it("returns nothing for an empty snapshot", () => {
    assert.deepEqual(buildLivestockQuotes({}), []);
  });
});
