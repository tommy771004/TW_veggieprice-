import { expect, test, type Page } from "@playwright/test";

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
  {
    date: "2026-07-15",
    avgPrice: null,
    volume: null,
    label: "07/15",
    isClosed: true,
  },
  { date: "2026-07-16", avgPrice: 47.2, volume: 181000, label: "07/16" },
  { date: "2026-07-17", avgPrice: 48.2, volume: 185000, label: "07/17" },
];

const livestockResponse = {
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
};

async function loadHomepage(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/prices/overview") {
      await route.fulfill({ json: overviewResponse });
      return;
    }

    if (url.pathname === "/api/prices/overview/trend") {
      await route.fulfill({ json: trendResponse });
      return;
    }

    if (url.pathname === "/api/prices/movers") {
      await route.fulfill({ json: [] });
      return;
    }

    if (url.pathname === "/api/prices/livestock") {
      await route.fulfill({ json: livestockResponse });
      return;
    }

    if (url.pathname === "/api/prices/seasonal") {
      await route.fulfill({ json: [] });
      return;
    }

    if (
      url.pathname === "/api/insights/rest-days" ||
      url.pathname === "/api/insights/weather-risk"
    ) {
      await route.fulfill({ json: [] });
      return;
    }

    await route.continue();
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("veggieprice_onboarding_seen", "1");
  });
  await page.goto("/");
}

test("homepage weekly trend explains price movement", async ({ page }) => {
  await loadHomepage(page);

  await page.getByRole("button", { name: /水果類/ }).click();
  const heading = page.getByRole("heading", { name: "本週水果類均價走勢" });
  await heading.scrollIntoViewIfNeeded();

  await expect(
    page.getByRole("img", { name: /全國概況.*均價走勢/ }),
  ).toBeVisible();
  await expect(page.getByText("價格（元/公斤）")).toBeVisible();
  await expect(page.getByText("休市 07/15")).toBeVisible();

  const latestPoint = page.getByRole("button", { name: /07\/17.*48\.2/ });
  await latestPoint.focus();
  await latestPoint.press("Enter");
  await expect(page.getByRole("status")).toContainText("$48.2");
  await latestPoint.press("Space");
  await latestPoint.hover();
  await expect(page.getByRole("status")).toContainText("交易量");
  await expect(page.getByRole("status")).toContainText("185.0 公噸");
  await expect(page.getByRole("status")).toContainText("$48.2");
});

test("livestock items link to meat search", async ({ page }) => {
  await loadHomepage(page);

  const section = page.getByRole("heading", { name: "民生物資行情" });
  await section.scrollIntoViewIfNeeded();

  const eggLink = page.getByRole("link", { name: /雞蛋大運輸價/ });
  const porkLink = page.getByRole("link", { name: /毛豬全國加權均價/ });
  await expect(eggLink).toBeVisible();
  await expect(porkLink).toBeVisible();

  for (const [link, crop] of [
    [eggLink, "雞蛋"],
    [porkLink, "毛豬"],
  ] as const) {
    const href = await link.getAttribute("href");
    const url = new URL(href ?? "", page.url());
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("type")).toBe("meat");
    expect(url.searchParams.get("market")).toBe("全國平均");
    expect(url.searchParams.get("q")).toBe(crop);
  }

  await eggLink.click();
  await expect(page).toHaveURL(/\/search\?/);
  const destination = new URL(page.url());
  expect(destination.searchParams.get("type")).toBe("meat");
  expect(destination.searchParams.get("market")).toBe("全國平均");
  expect(destination.searchParams.get("q")).toBe("雞蛋");
});
