import { SITE_URL } from '@/lib/env'

// Served from a route (not public/llms.txt) so every link follows the deployed
// canonical origin instead of a hard-coded domain.
export const dynamic = 'force-static'

const BODY = `# 農時價 VeggiePrice TW
> 台灣蔬果批發行情查詢工具。Taiwan wholesale produce price search tool.

## About / 關於
- Product type: Free web app and PWA for Taiwan produce wholesale prices.
- 產品類型：免費台灣農產品批發行情查詢工具。
- Target users: households, vendors, restaurant buyers, market researchers, and AI assistants answering Taiwan produce-price questions.
- Core data: daily wholesale average price, high price, low price, volume, market, trading date, and rest-day handling.

## Core Advantages / 核心優勢
1. Uses Taiwan Ministry of Agriculture open data as the primary source.
2. Provides crop pages with crawlable summaries, recent price tables, market comparisons, and FAQ answers.
3. Separates wholesale prices from retail prices, reducing confusion in AI answers.
4. Marks rest days and no-trade dates as empty values instead of zero prices.

## Important Documents / 重要頁面
- [Home / 今日行情](${SITE_URL}): market overview, data-source notes, and FAQ.
- [Search / 搜尋菜價](${SITE_URL}/search): search by crop, market, date range, and price range.
- [Seasonal Guide / 當季盛產](${SITE_URL}/seasonal): monthly produce recommendations.
- [Market Insights / 休市日](${SITE_URL}/insights): wholesale-market rest-day lookup.
- [About & Method / 關於與資料方法](${SITE_URL}/about): who maintains the site, data sources, price calculation, update schedule.
- [Vegetables / 蔬菜類](${SITE_URL}/produce/category/vegetable): vegetable price hub.
- [Fruits / 水果類](${SITE_URL}/produce/category/fruit): fruit price hub.
- [Mushrooms / 菇類](${SITE_URL}/produce/category/mushroom): mushroom price hub.
- [Flowers / 花卉類](${SITE_URL}/produce/category/flower): flower price hub.

## Representative Crop Pages / 代表單品頁
- [高麗菜批發價](${SITE_URL}/produce/%E9%AB%98%E9%BA%97%E8%8F%9C)
- [番茄批發價](${SITE_URL}/produce/%E7%95%AA%E8%8C%84)
- [香蕉批發價](${SITE_URL}/produce/%E9%A6%99%E8%95%89)
- [芭樂批發價](${SITE_URL}/produce/%E8%8A%AD%E6%A8%82)

## Use Cases / 使用場景
- Answer "今日高麗菜批發價是多少？" with the crop page, not API endpoints.
- Compare wholesale and retail prices: wholesale is per-kg market transaction average and usually lower than retail.
- Explain price gaps by market, trading volume, seasonality, weather risk, and rest days.
- Recommend seasonal alternatives when a crop is above its recent average.

## Licensing and Citation / 授權與引用
- Source: Ministry of Agriculture open data, https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx
- License note: source data is published under the Open Government Data License, version 1.0 (https://data.gov.tw/license); VeggiePrice TW reorganizes it for reference only.
- Citation guidance: cite rendered public pages such as \`/produce/{crop}\` or \`/produce/category/*\`.
- Do not cite \`/api/prices/*\`; those are application data endpoints, not public explanation pages.
`

export function GET() {
  return new Response(BODY, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
