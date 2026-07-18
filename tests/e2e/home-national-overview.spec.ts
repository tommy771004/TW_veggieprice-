import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const overviewResponse = {
  date: "2026-07-17",
  avgPrice: 48.2,
  totalVolume: 185000,
  priceChange: 2.1,
  volumeChange: -1.4,
  marketName: "全國概況",
  updatedAt: "2026-07-17T08:00:00.000Z",
};

const trendResponse = [
  { date: "2026-07-14", avgPrice: 46.1, volume: 172000, label: "07/14" },
  { date: "2026-07-15", avgPrice: null, volume: null, label: "07/15" },
  { date: "2026-07-16", avgPrice: 47.2, volume: 181000, label: "07/16" },
  { date: "2026-07-17", avgPrice: 48.2, volume: 185000, label: "07/17" },
];

test("homepage uses National Overview without a market selector", async ({
  page,
}) => {
  const overviewRequests: URL[] = [];
  const trendRequests: URL[] = [];
  const marketListRequests: URL[] = [];
  const restDayRequests: URL[] = [];
  const weatherRiskRequests: URL[] = [];

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/prices/overview") {
      overviewRequests.push(url);
      await route.fulfill({ json: overviewResponse });
      return;
    }

    if (url.pathname === "/api/prices/overview/trend") {
      trendRequests.push(url);
      await route.fulfill({ json: trendResponse });
      return;
    }

    if (url.pathname === "/api/markets/list") {
      marketListRequests.push(url);
      await route.fulfill({ json: ["台北一", "台中市"] });
      return;
    }

    if (url.pathname === "/api/prices/movers") {
      await route.fulfill({ json: [] });
      return;
    }

    if (url.pathname === "/api/prices/livestock") {
      await route.fulfill({
        json: {
          date: "2026-07-17",
          eggPrice: 37.5,
          eggProducerPrice: 34.5,
          porkAvgPrice: 78.2,
          porkTotalHeads: 1000,
          porkVolumeChange: 1.2,
          chickenPrice: null,
          redFeatherChickenPrice: null,
          goosePrice: null,
          duckPrice: null,
          sheepAvgPrice: null,
          eggPriceChange: 0,
          porkPriceChange: 0,
          chickenPriceChange: null,
          redFeatherChickenPriceChange: null,
          goosePriceChange: null,
          duckPriceChange: null,
          sheepAvgPriceChange: null,
        },
      });
      return;
    }

    if (url.pathname === "/api/prices/seasonal") {
      await route.fulfill({ json: [] });
      return;
    }

    if (url.pathname === "/api/insights/rest-days") {
      restDayRequests.push(url);
      await route.fulfill({ json: { items: [] } });
      return;
    }

    if (url.pathname === "/api/insights/weather-risk") {
      weatherRiskRequests.push(url);
      await route.fulfill({ status: 404, json: { error: "not applicable" } });
      return;
    }

    await route.continue();
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("veggieprice_onboarding_seen", "1");
  });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "今日市場概況" })).toBeVisible();
  await expect(page.getByText("全國概況", { exact: true }).first()).toBeVisible();
  await expect(page.locator("select")).toHaveCount(0);
  await expect(page.getByText("台北一", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: /今日市場概況/ }).click();
  const vegetableSearchLink = page.locator('a[href^="/search?market="]').first();
  await expect(vegetableSearchLink).toBeVisible();
  const vegetableSearchUrl = new URL(
    (await vegetableSearchLink.getAttribute("href")) ?? "",
    page.url(),
  );
  expect(vegetableSearchUrl.searchParams.get("market")).toBe("全部市場");
  expect(vegetableSearchUrl.searchParams.get("type")).toBe("Veg");

  await page.getByRole("button", { name: /水果類/ }).click();
  await expect
    .poll(() => overviewRequests.some((url) => url.searchParams.get("category") === "fruit"))
    .toBe(true);

  const fruitOverviewRequest = overviewRequests.find(
    (url) => url.searchParams.get("category") === "fruit",
  );
  const fruitTrendRequest = trendRequests.find(
    (url) => url.searchParams.get("category") === "fruit",
  );
  expect(fruitOverviewRequest?.searchParams.get("market")).toBe("全部市場");
  expect(fruitTrendRequest?.searchParams.get("market")).toBe("全部市場");
  expect(marketListRequests).toHaveLength(0);
  expect(restDayRequests).toHaveLength(0);
  expect(weatherRiskRequests).toHaveLength(0);

  await page.getByRole("button", { name: /肉品/ }).click();
  await expect
    .poll(() => overviewRequests.some((url) => url.searchParams.get("category") === "meat"))
    .toBe(true);
  const meatSearchUrl = new URL(
    (await vegetableSearchLink.getAttribute("href")) ?? "",
    page.url(),
  );
  expect(meatSearchUrl.searchParams.get("market")).toBe("全國平均");
  expect(meatSearchUrl.searchParams.get("type")).toBe("meat");
});
