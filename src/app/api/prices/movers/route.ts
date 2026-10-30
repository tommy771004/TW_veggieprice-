import { NextResponse } from "next/server";
import { getTopMovers } from "@/lib/server/marketTopMovers";

export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "vegetable";

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
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        };

  return NextResponse.json(result.movers, { headers });
}
