import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("seafood category keeps the homepage hydrated and data-backed", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const seafoodResponses = new Map<string, number>();

  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.searchParams.get("category") !== "seafood") return;

    const endpoints = [
      "/api/prices/overview",
      "/api/prices/overview/trend",
      "/api/prices/movers",
    ];
    if (endpoints.includes(url.pathname)) {
      seafoodResponses.set(url.pathname, response.status());
    }
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.localStorage.setItem("veggieprice_onboarding_seen", "1");
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "今日市場概況" })).toBeVisible();

  // This catches the production React #418 before the category interaction.
  expect(pageErrors).toEqual([]);

  await page.getByRole("button", { name: /漁產/ }).click();
  await expect
    .poll(() => seafoodResponses.size)
    .toBe(3);

  expect([...seafoodResponses.values()]).toEqual([200, 200, 200]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("seafood deep links use the requested market type on the first search", async ({
  page,
}) => {
  const requestTypes: string[] = [];

  await page.route("**/api/meta/options", async (route) => {
    // Keep metadata slow enough to expose a search that races ahead with its
    // hard-coded default market type.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/prices") {
      requestTypes.push(url.searchParams.get("type") ?? "");
    }
  });

  await page.goto(
    "/search?market=%E5%85%A8%E9%83%A8%E5%B8%82%E5%A0%B4&type=seafood&q=%E6%AF%9B%E8%B1%AC",
  );
  await expect
    .poll(() => requestTypes.length)
    .toBeGreaterThan(0);

  expect(requestTypes[0]).toBe("seafood");
  expect(requestTypes).not.toContain("Veg");
});
