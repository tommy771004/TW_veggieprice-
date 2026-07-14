import { expect, test } from "@playwright/test";

const ONE_HOUR_CACHE = "public, s-maxage=3600, stale-while-revalidate=7200";

test("homepage data hotspots advertise their intended cache lifetime", async ({
  request,
}) => {
  const endpoints = [
    "/api/markets/list?type=meat",
    "/api/prices/overview?market=%E5%8F%B0%E4%B8%AD&category=seafood",
    "/api/prices/movers?category=seafood",
  ];

  for (const endpoint of endpoints) {
    const response = await request.get(endpoint);

    expect(response.ok(), endpoint).toBeTruthy();
    expect(response.headers()["cache-control"], endpoint).toBe(ONE_HOUR_CACHE);
  }
});
