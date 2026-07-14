import { NextResponse } from "next/server";
import { getCropEmoji } from "@/lib/utils";
import {
  fetchLatestSeafoodData,
  fetchLivestockPrices,
  fetchRecentOpenData,
  CROP_TYPE_FRUIT,
  CROP_TYPE_VEG,
  type SeafoodRawRecord,
} from "@/lib/server/moa";
import { bustCacheOnReload } from "@/lib/server/freshReload";

export const maxDuration = 60;
const OPEN_DATA_MIN_VOLUME_KG = 2000;
const MAX_BASELINE_TRADING_DAYS = 7;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "vegetable";

  if (category === "meat") {
    try {
      bustCacheOnReload(req, ["moa-livestock-prices"]);
      const livestock = await fetchLivestockPrices();
      const movers = [
        {
          name: "毛豬",
          price: livestock.porkAvgPrice,
          change: livestock.porkPriceChange,
        },
        {
          name: "白肉雞",
          price: livestock.chickenPrice,
          change: livestock.chickenPriceChange,
        },
        {
          name: "紅羽土雞",
          price: livestock.redFeatherChickenPrice,
          change: livestock.redFeatherChickenPriceChange,
        },
        {
          name: "肉鵝",
          price: livestock.goosePrice,
          change: livestock.goosePriceChange,
        },
        {
          name: "肉鴨",
          price: livestock.duckPrice,
          change: livestock.duckPriceChange,
        },
        {
          name: "羊",
          price: livestock.sheepAvgPrice,
          change: livestock.sheepAvgPriceChange,
        },
        {
          name: "雞蛋",
          price: livestock.eggPrice,
          change: livestock.eggPriceChange,
        },
      ]
        .map((item) => ({
          cropCode: "M01",
          cropName: item.name,
          marketName: "全國平均",
          grade: "中平",
          upperPrice: item.price || 0,
          middlePrice: item.price || 0,
          lowerPrice: item.price || 0,
          avgPrice: item.price || 0,
          transWeight: 1000,
          date: livestock.date,
          currentPrice: item.price || 0,
          priceChange: item.change || 0,
          emoji: getCropEmoji(item.name),
        }))
        .filter((m) => m.avgPrice > 0)
        .sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange))
        .slice(0, 5);
      return NextResponse.json(movers, {
        headers: { "Cache-Control": "public, s-maxage=3600" },
      });
    } catch {
      return NextResponse.json({ error: "查無波動排行資料" }, { status: 404 });
    }
  } else if (category === "seafood") {
    try {
      bustCacheOnReload(req, ["moa-latest-seafood-data"]);
      const records = await fetchLatestSeafoodData();

      const tradingDates = [
        ...new Set(
          records
            .map((r: SeafoodRawRecord) => String(r["交易日期"] ?? ""))
            .filter(Boolean),
        ),
      ]
        .sort()
        .reverse() as string[];
      const latestDate: string = tradingDates[0] as string;
      if (!latestDate) throw new Error("No data");

      const cropDateSums: Record<
        string,
        Record<
          string,
          { sumPriceVol: number; sumVol: number; cropCode: string }
        >
      > = {};

      // MOA's seafood feed occasionally reports a stub quote (上價=中價=下價=平均價)
      // shared identically across many unrelated species from the same market on
      // the same day — a "no real trade" placeholder rather than an actual price.
      // Cluster same market+date+price records to detect and drop that noise
      // before it distorts the daily average / mover ranking.
      const priceClusters = new Map<string, Set<string>>();
      for (const record of records as SeafoodRawRecord[]) {
        const upper = Number(record["上價"]);
        const middle = Number(record["中價"]);
        const lower = Number(record["下價"]);
        const avg = Number(record["平均價"]);
        if (upper === middle && middle === lower && upper === avg && avg > 0) {
          const key = `${record["市場名稱"]}|${record["交易日期"]}|${avg}`;
          const names = priceClusters.get(key) ?? new Set<string>();
          names.add(String(record["魚貨名稱"] ?? ""));
          priceClusters.set(key, names);
        }
      }

      for (const record of records as SeafoodRawRecord[]) {
        const name = String(record["魚貨名稱"] ?? "");
        // "其他XX" are generic/miscellaneous catch-all buckets, not one
        // consistent commodity — their average swings wildly day to day
        // purely because the mix of species lumped into them changes.
        if (name.startsWith("其他")) continue;

        const avgPrice = Number(record["平均價"]) || 0;
        const transWeight = Number(record["交易量"]) || 0;

        const upper = Number(record["上價"]);
        const middle = Number(record["中價"]);
        const lower = Number(record["下價"]);
        if (upper === middle && middle === lower && upper === avgPrice) {
          const key = `${record["市場名稱"]}|${record["交易日期"]}|${avgPrice}`;
          if ((priceClusters.get(key)?.size ?? 0) >= 3) continue; // placeholder stub
        }

        if (avgPrice > 0 && transWeight > 0) {
          const d = String(record["交易日期"] ?? "");
          if (!cropDateSums[name]) cropDateSums[name] = {};
          if (!cropDateSums[name][d])
            cropDateSums[name][d] = {
              sumPriceVol: 0,
              sumVol: 0,
              cropCode: String(record["品種代碼"] ?? ""),
            };

          cropDateSums[name][d].sumPriceVol += avgPrice * transWeight;
          cropDateSums[name][d].sumVol += transWeight;
        }
      }

      const movers = Object.keys(cropDateSums)
        .map((cropNameKey) => {
          const cropName = String(cropNameKey);
          const todayData = cropDateSums[cropName]?.[latestDate];
          if (!todayData || todayData.sumVol < 50) return null; // seafood weights are smaller, use 50kg

          const currentPrice = todayData.sumPriceVol / todayData.sumVol;

          // Only compare against a baseline within the last week of trading
          // days — reaching further back would label a multi-week price
          // drift as if it were a recent "mover".
          let baselinePrice = 0;
          for (let i = 1; i < tradingDates.length && i <= 7; i++) {
            const prevDate = tradingDates[i] as string;
            const prevData = cropDateSums[cropName]?.[prevDate];
            if (prevData && prevData.sumVol >= 50) {
              baselinePrice = prevData.sumPriceVol / prevData.sumVol;
              break;
            }
          }

          if (baselinePrice <= 0) return null;

          const change = ((currentPrice - baselinePrice) / baselinePrice) * 100;

          return {
            cropCode: todayData.cropCode,
            cropName: cropName,
            marketName: "全國平均",
            grade: "不分",
            currentPrice: Math.round(currentPrice * 10) / 10,
            priceChange: Math.round(change * 10) / 10,
            emoji: getCropEmoji(cropName),
            transWeight: Math.round(todayData.sumVol),
          };
        })
        .filter(
          (m): m is NonNullable<typeof m> => m !== null && m.currentPrice >= 3,
        )
        .sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange))
        .slice(0, 5);

      return NextResponse.json(movers, {
        headers: { "Cache-Control": "public, s-maxage=3600" },
      });
    } catch {
      return NextResponse.json({ error: "查無波動排行資料" }, { status: 404 });
    }
  }

  // Fetch recent open data directly to ensure fallback to local latest-opendata.json.
  // Crop codes are numeric in the MOA feed, so category must use TcType (N04/N05),
  // not a string prefix heuristic.
  const cropType = category === "fruit" ? CROP_TYPE_FRUIT : CROP_TYPE_VEG;

  bustCacheOnReload(req, ["moa-recent-opendata"]);
  let recentRecords = await fetchRecentOpenData();
  const allRecords = recentRecords.filter(
    (r) =>
      r.marketName !== "全國平均" &&
      r._typeCode === cropType,
  );

  if (allRecords.length === 0) {
    return NextResponse.json({ error: "查無波動排行資料" }, { status: 404 });
  }

  // Collect distinct trading dates in descending order.
  const tradingDates = [
    ...new Set(allRecords.map((r) => r.date).filter(Boolean)),
  ]
    .sort()
    .reverse();
  const latestDate = tradingDates[0] ?? "";

  if (!latestDate) {
    return NextResponse.json({ error: "查無波動排行資料" }, { status: 404 });
  }

  // Group all records by cropName and date for highly efficient indexing and lookup.
  const cropDateSums: Record<
    string,
    Record<string, { sumPriceVol: number; sumVol: number; cropCode: string }>
  > = {};

  for (const record of allRecords) {
    if (record.avgPrice > 0 && record.transWeight > 0) {
      const name = record.cropName;
      const d = record.date;
      if (!cropDateSums[name]) {
        cropDateSums[name] = {};
      }
      if (!cropDateSums[name][d]) {
        cropDateSums[name][d] = {
          sumPriceVol: 0,
          sumVol: 0,
          cropCode: record.cropCode,
        };
      }
      cropDateSums[name][d].sumPriceVol += record.avgPrice * record.transWeight;
      cropDateSums[name][d].sumVol += record.transWeight;
    }
  }

  const movers = Object.keys(cropDateSums)
    .map((cropName) => {
      const todayData = cropDateSums[cropName][latestDate];
      if (!todayData || todayData.sumVol < OPEN_DATA_MIN_VOLUME_KG) return null;

      const currentPrice = todayData.sumPriceVol / todayData.sumVol;

      // Compare the latest aggregate quote to the nearest valid prior trading
      // day, looking back no more than one trading week. This avoids presenting
      // a multi-week drift as a recent price movement.
      let baselinePrice = 0;
      for (
        let i = 1;
        i < tradingDates.length && i <= MAX_BASELINE_TRADING_DAYS;
        i++
      ) {
        const prevDate = tradingDates[i];
        const prevData = cropDateSums[cropName][prevDate];
        if (prevData && prevData.sumVol >= OPEN_DATA_MIN_VOLUME_KG) {
          baselinePrice = prevData.sumPriceVol / prevData.sumVol;
          break;
        }
      }

      if (baselinePrice <= 0) return null;

      const change = ((currentPrice - baselinePrice) / baselinePrice) * 100;

      return {
        cropCode: todayData.cropCode,
        cropName: cropName,
        marketName: "全國平均",
        grade: "不分",
        currentPrice: Math.round(currentPrice * 10) / 10,
        priceChange: Math.round(change * 10) / 10,
        emoji: getCropEmoji(cropName),
        transWeight: Math.round(todayData.sumVol),
      };
    })
    .filter(
      (m): m is NonNullable<typeof m> => m !== null && m.currentPrice >= 3,
    )
    .sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange))
    .slice(0, 5);

  if (movers.length === 0) {
    return NextResponse.json({ error: "查無波動排行資料" }, { status: 404 });
  }

  return NextResponse.json(movers, {
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
    },
  });
}
