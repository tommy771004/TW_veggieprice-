import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

// Mirrors the compact DTO contract in src/lib/priceDto.ts. If the route ever
// drops a column again, this fixture stops matching what the page decodes.
const COMPACT_KEYS = [
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
];

const pricesResponse = {
  keys: COMPACT_KEYS,
  data: [
    ["LA1", "甘藍", "台北一", "", 30, 22, 15, 22.5, 12345, "2026-07-17", -6.3],
    ["SB1", "青蔥", "台北一", "", 120, 95, 70, 96.4, 4200, "2026-07-17", 18.2],
    ["FA1", "蘿蔔", "台北一", "", 25, 18, 12, 18.4, 8800, "2026-07-17", 3.1],
  ],
  total: 3,
  page: 1,
  hasNextPage: false,
};

const metaOptionsResponse = {
  marketTypes: [
    { value: "Veg", label: "蔬菜市場", description: "蔬菜批發市場即時行情" },
  ],
  marketsByType: { Veg: ["全部市場", "台北一", "台北二"] },
  defaultMarketType: "Veg",
  defaultMarket: "台北一",
  dateRanges: [{ label: "今日", value: "1d" }],
  pricePeriods: [],
  source: "e2e-fixture",
  updatedAt: "2026-07-17T08:00:00.000Z",
};

async function stubApi(page: Page) {
  // The first-visit onboarding overlay swallows every click otherwise.
  await page.addInitScript(() => {
    window.localStorage.setItem("veggieprice_onboarding_seen", "1");
  });

  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname === "/api/prices") {
      await route.fulfill({ json: pricesResponse });
      return;
    }
    if (pathname === "/api/meta/options") {
      await route.fulfill({ json: metaOptionsResponse });
      return;
    }
    if (pathname === "/api/insights/rest-days") {
      await route.fulfill({ json: { items: [] } });
      return;
    }
    if (pathname === "/api/affiliates") {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({ json: null });
  });
}

const rowOf = (page: Page, cropName: string) =>
  page.locator(`[data-testid="produce-row"][data-crop-name="${cropName}"]`);

const changeOf = (page: Page, cropName: string) =>
  rowOf(page, cropName).getByTestId("produce-row-change");

test.describe("search results price change", () => {
  test.beforeEach(async ({ page }) => {
    await stubApi(page);
    await page.goto("/search");
  });

  test("renders the priceChange the API sent, not 0%", async ({ page }) => {
    await expect(changeOf(page, "青蔥")).toHaveText(/\+18\.2%/);
    await expect(changeOf(page, "甘藍")).toHaveText(/-6\.3%/);
    await expect(changeOf(page, "蘿蔔")).toHaveText(/\+3\.1%/);
  });

  test("sorts by price change", async ({ page }) => {
    await expect(page.getByTestId("produce-row")).toHaveCount(3);

    await page.getByLabel("排序方式").selectOption("change");
    await expect(page.getByTestId("produce-row").first()).toHaveAttribute(
      "data-crop-name",
      "青蔥",
    );

    const order = await page
      .getByTestId("produce-row")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-crop-name")),
      );
    expect(order).toEqual(["青蔥", "蘿蔔", "甘藍"]);
  });
});
