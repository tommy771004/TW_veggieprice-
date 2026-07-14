import { NextResponse } from "next/server";
import { getCropEmoji } from "@/lib/utils";
import {
  fetchLatestSeafoodData,
  fetchMarketWindowRecords,
  fetchLivestockPrices,
} from "@/lib/server/moa";
import { subtractDays, todayISO } from "@/lib/server/dateUtils";

export const maxDuration = 60;

// Minimum transaction weight (kg) required both today and in the 3-day baseline
// to prevent low-volume outliers from dominating the movers list.
const MIN_WEIGHT = 100;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "vegetable";
  const today = todayISO();

  if (category === "meat") {
    try {
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
      const records = await fetchLatestSeafoodData();

      const tradingDates = [
        ...new Set(
          records.map((r: any) => String(r["交易日期"])).filter(Boolean),
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

      for (const record of records) {
        const avgPrice = Number(record["平均價"]) || 0;
        const transWeight = Number(record["交易量"]) || 0;
        if (avgPrice > 0 && transWeight > 0) {
          const name = String(record["魚貨名稱"]);
          const d = String(record["交易日期"]);
          if (!cropDateSums[name]) cropDateSums[name] = {};
          if (!cropDateSums[name][d])
            cropDateSums[name][d] = {
              sumPriceVol: 0,
              sumVol: 0,
              cropCode: String(record["品種代碼"]),
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

          let baselinePrice = 0;
          for (let i = 1; i < tradingDates.length; i++) {
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

  // Fetch recent open data directly to ensure fallback to local latest-opendata.json
  const mType = category === "fruit" ? "Fruit" : "Veg";
  const { fetchRecentOpenData } = await import("@/lib/server/moa");

  let recentRecords = await fetchRecentOpenData();
  const allRecords = recentRecords.filter(
    (r) =>
      r.marketName !== "全國平均" &&
      (mType === "Fruit"
        ? r.cropCode.startsWith("F") || r._typeCode === "Fruit"
        : !r.cropCode.startsWith("F") && r._typeCode !== "Fruit"),
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
      if (!todayData || todayData.sumVol < 2000) return null;

      const currentPrice = todayData.sumPriceVol / todayData.sumVol;

      // Look back through tradingDates starting from yesterday (index 1) to find the first previous day with data for this crop.
      let baselinePrice = 0;
      for (let i = 1; i < tradingDates.length; i++) {
        const prevDate = tradingDates[i];
        const prevData = cropDateSums[cropName][prevDate];
        if (prevData && prevData.sumVol >= 2000) {
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
