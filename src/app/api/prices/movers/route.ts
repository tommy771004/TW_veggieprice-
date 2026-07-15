import { NextResponse } from "next/server";
import { getTopMovers } from "@/lib/server/marketTopMovers";
import { bustCacheOnReload } from "@/lib/server/freshReload";

export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "vegetable";

  if (category === "meat") {
    bustCacheOnReload(req, ["moa-livestock-prices"]);
  } else if (category === "seafood") {
    bustCacheOnReload(req, ["moa-latest-seafood-data"]);
  } else {
    bustCacheOnReload(req, ["moa-recent-opendata"]);
  }

  const result = await getTopMovers({ category });
  if (result.error || result.movers.length === 0) {
    return NextResponse.json(
      { error: result.error || "查無波動排行資料" },
      { status: 404 },
    );
  }

  const headers =
    category === "seafood" || category === "meat"
      ? { "Cache-Control": "public, s-maxage=3600" }
      : {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        };

  return NextResponse.json(result.movers, { headers });
}
