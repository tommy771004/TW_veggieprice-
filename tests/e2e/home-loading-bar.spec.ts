import { expect, test } from "@playwright/test";

// The app registers a network-first service worker; block it so route
// interception remains the deterministic network seam for this E2E test.
test.use({ serviceWorkers: "block" });

const overviewResponse = {
  date: "2026-07-14",
  avgPrice: 42.5,
  totalVolume: 128000,
  priceChange: 1.2,
  volumeChange: -2.4,
  marketName: "台北一",
  updatedAt: "2026-07-14T00:00:00.000Z",
};

const moversResponse = [
  {
    cropCode: "V01",
    cropName: "高麗菜",
    marketName: "台北一",
    grade: "中等",
    currentPrice: 42.5,
    priceChange: 4.2,
    emoji: "🥬",
  },
];

const trendResponse = [
  {
    date: "2026-07-13",
    avgPrice: 41.9,
    volume: 124000,
    label: "07/13",
  },
  {
    date: "2026-07-14",
    avgPrice: 42.5,
    volume: 128000,
    label: "07/14",
  },
];

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

test("shows the top loading bar during initial and category data loads", async ({
  page,
}) => {
  const overviewGates = [deferred(), deferred()];
  const moversGates = [deferred(), deferred()];
  let overviewRequests = 0;
  let moversRequests = 0;

  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname === "/api/prices/overview") {
      const gate = overviewGates[Math.min(overviewRequests, overviewGates.length - 1)];
      overviewRequests += 1;
      await gate.promise;
      await route.fulfill({ json: overviewResponse });
      return;
    }

    if (pathname === "/api/prices/movers") {
      const gate = moversGates[Math.min(moversRequests, moversGates.length - 1)];
      moversRequests += 1;
      await gate.promise;
      await route.fulfill({ json: moversResponse });
      return;
    }

    if (pathname === "/api/prices/overview/trend") {
      await route.fulfill({ json: trendResponse });
      return;
    }

    if (pathname === "/api/markets/list") {
      await route.fulfill({ json: ["台北一", "台北二", "台中市"] });
      return;
    }

    if (pathname === "/api/insights/rest-days") {
      await route.fulfill({ json: { items: [] } });
      return;
    }

    if (pathname === "/api/insights/weather-risk") {
      await route.fulfill({ status: 404, json: { error: "not in test scope" } });
      return;
    }

    if (
      pathname === "/api/prices/livestock" ||
      pathname === "/api/prices/seasonal"
    ) {
      await route.fulfill({ status: 404, json: { error: "not in test scope" } });
      return;
    }

    await route.continue();
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("veggieprice_onboarding_seen", "1");
  });
  await page.goto("/");

  const loadingBar = page.getByTestId("homepage-loading-bar");
  await expect(loadingBar).toBeVisible();
  await expect(loadingBar).toHaveAttribute("aria-hidden", "true");
  await expect.poll(() => moversRequests).toBe(1);

  for (let i = 0; i < overviewRequests; i += 1) {
    overviewGates[Math.min(i, overviewGates.length - 1)].resolve();
  }
  for (let i = 0; i < moversRequests; i += 1) {
    moversGates[Math.min(i, moversGates.length - 1)].resolve();
  }
  await expect(loadingBar).toBeHidden();

  const initialOverviewRequests = overviewRequests;
  const initialMoversRequests = moversRequests;
  await page.getByRole("button", { name: /水果類/ }).click();
  await expect(loadingBar).toBeVisible();
  await expect
    .poll(() => overviewRequests)
    .toBeGreaterThan(initialOverviewRequests);
  await expect
    .poll(() => moversRequests)
    .toBeGreaterThan(initialMoversRequests);

  for (let i = initialOverviewRequests; i < overviewRequests; i += 1) {
    overviewGates[Math.min(i, overviewGates.length - 1)].resolve();
  }
  for (let i = initialMoversRequests; i < moversRequests; i += 1) {
    moversGates[Math.min(i, moversGates.length - 1)].resolve();
  }
  await expect(loadingBar).toBeHidden();
});

test.describe("homepage hydration", () => {
  test.use({ serviceWorkers: "block" });

  test("does not report a hydration error for reduced-motion visitors", async ({ page }) => {
    const hydrationErrors: string[] = [];
    const recordError = (message: string) => {
      if (message.includes("Hydration failed") || message.includes("Minified React error #418")) {
        hydrationErrors.push(message);
      }
    };

    page.on("console", (message) => {
      if (message.type() === "error") recordError(message.text());
    });
    page.on("pageerror", (error) => recordError(error.message));

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "今日市場概況" })).toBeVisible();
    await expect.poll(() => hydrationErrors).toEqual([]);
  });
});
