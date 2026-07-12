# 休市日行事曆 — 7 日天氣預報圖示 設計文件

日期：2026-07-12
範圍：`src/components/pages/InsightsClient.tsx`（洞察頁「批發市場休市日」行事曆）

> **已修正（實作中發現）：** 本文件原規劃的 CWA 資料集 `F-C0032-005` 經上線實測回傳
> HTTP 404，實際不存在。已改用 `F-D0047-091`（一般天氣預報－未來1週天氣預報），
> 其 JSON 結構亦不同（`records.Locations[0].Location[].WeatherElement[].Time[].ElementValue[]`，
> 而非本文件下方所寫的 `records.location[0].weatherElement[].time[].parameter`）。
> 詳見 commit `4772c98`／`53f6c02`。以下「資料來源」與相關程式碼區塊保留原始設計紀錄，
> 實作請以原始碼（`src/lib/server/cwaForecast.ts`、`src/lib/server/cwa.ts`）為準。

## 背景

行事曆目前只在頁首顯示一個「當月天氣風險」圖示（來自 `fetchMarketWeatherRisk`，本質是「目前觀測」的風險評分，非未來預報）。使用者要求：

1. 在行事曆日期格加上天氣圖示
2. 顯示從今天起往後 7 天的天氣預報
3. 依「所選市場的地理位置」與「日期」對應到正確的天氣資料

現有 codebase 內沒有任何真正的「未來預報」API（`/api/weather`、`/api/insights/weather-risk` 都只是 MOA 測站的目前/近期觀測平均）。因此本功能需新接中央氣象署（CWA）開放資料平台的一週縣市天氣預報。

## 資料來源

CWA Open Data：`F-C0032-005`（一般天氣預報－一週縣市天氣預報），縣市層級，每日日/夜兩個 12 小時區段，含 `Wx`（天氣現象文字）、`MaxT`／`MinT`（氣溫）、`PoP12h`（12 小時降雨機率）。

```
GET https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-005
    ?Authorization=<CWA_API_KEY>&locationName=<縣市>&format=JSON
```

需會員授權碼（`CWA_API_KEY`），使用者已持有，之後自行填入 `.env`。**未設定或請求失敗時一律靜默降級（回傳空陣列），不得拋錯中斷行事曆渲染** — 與專案既有的「選填服務未設定時安靜略過」慣例一致（見 `.env.example` 的 `DATABASE_URL` 註解）。

## 架構

```
InsightsClient.tsx (market 變動時觸發)
        │ fetchMarketWeatherForecast(market)   [src/lib/api.ts]
        ▼
/api/insights/weather-forecast?market=... [新 Route Handler]
        │ resolveCountyFromMarketName(market)  [既有, src/lib/server/moa.ts]
        ▼
fetchWeeklyForecast(county)  [新, src/lib/server/cwa.ts]
        │ unstable_cache, revalidate 3600s
        ▼
CWA F-C0032-005 API
```

### 1. `src/lib/server/cwa.ts`（新檔案）

- `fetchWeeklyForecast(county: string): Promise<DailyForecast[]>`
- 沿用 `moa.ts` 既有慣例：`AbortController` 逾時（同 `MOA_FETCH_TIMEOUT_MS` 概念，各自獨立常數 `CWA_FETCH_TIMEOUT_MS`，預設 10000ms）、`unstable_cache`（key 含 county，`revalidate: 3600`）。
- 解析 CWA JSON（`records.location[0].weatherElement[]`，每個 element 有 `time[]`），將同一天的日／夜兩個 12hr 區段合併成一筆：
  - `maxT` = 兩區段 MaxT 取大者
  - `minT` = 兩區段 MinT 取小者
  - `pop` = 兩區段 PoP12h 取大者
  - `wxText` = 白天（或若白天已過，取夜間）區段的 Wx 文字
  - `icon` = `mapWxToIcon(wxText)`
- 只保留「今天起 7 天」（以 Asia/Taipei 當地日期計算，避免 UTC 位移導致今天判斷錯誤）。
- `mapWxToIcon(wxText: string): string`：關鍵字比對，沿用 `InsightsClient.tsx` 現有的 icon 詞彙（`sunny` / `cloud` / `partly_cloudy_day` / `rainy`），新增 `thunderstorm`：
  - 含「雷」→ `thunderstorm`
  - 含「雨」→ `rainy`
  - 含「多雲」→ `partly_cloudy_day`
  - 含「陰」→ `cloud`
  - 其餘（晴／晴時多雲等）→ `sunny`
- 任何例外（缺 `CWA_API_KEY`、fetch 失敗、非預期 JSON 結構）一律 catch 後回傳 `[]`，並 `console.log` 記錄原因（比照 `weather-risk` route 的 log 慣例），不對外拋錯。

### 2. 型別（`src/lib/types.ts`）

```ts
export interface DailyForecast {
  date: string        // ISO yyyy-mm-dd
  maxT: number | null
  minT: number | null
  pop: number | null  // 降雨機率 %
  wxText: string
  icon: string
}

export interface MarketWeatherForecast {
  county: string
  days: DailyForecast[]
}
```

### 3. Route Handler（新檔案）`src/app/api/insights/weather-forecast/route.ts`

- `GET`，`market` query param（缺省用 `DEFAULT_MARKET`，同 `weather-risk` route 慣例）
- `resolveCountyFromMarketName(market)` → `fetchWeeklyForecast(county)`
- 一律回傳 200 + `{ county, days }`（`days` 可能是 `[]`），`Cache-Control: public, s-maxage=1800, stale-while-revalidate=3600`
- `export const dynamic = 'force-dynamic'`、`maxDuration = 60`（比照 `weather-risk/route.ts`）

### 4. Client helper（`src/lib/api.ts`）

```ts
export async function fetchMarketWeatherForecast(market: string): Promise<MarketWeatherForecast> {
  const params = new URLSearchParams({ market })
  const res = await safeFetch(`${BASE}/insights/weather-forecast?${params}`)
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to fetch market weather forecast')
  return json as MarketWeatherForecast
}
```

### 5. UI（`InsightsClient.tsx`）

- 新 state：`const [forecast, setForecast] = useState<MarketWeatherForecast | null>(null)`
- 新 `useEffect`，依賴 `[market]`（與現有 `loadWeather`/`weatherRisk` effect 平行）：`market === '全部市場'` 時清空、否則呼叫 `fetchMarketWeatherForecast(market)`，失敗時 `setForecast(null)`（不顯示 error banner，維持行事曆乾淨）。
- `forecastByDate = Object.fromEntries((forecast?.days ?? []).map(d => [d.date, d]))`（最多 7 筆，稀疏 lookup）。
- 在既有日期格渲染區塊（gridDates.map）中，於日期數字列（現有 `isRest` 的 `cancel` icon 同一行）新增：若 `forecastByDate[dateString]` 存在，顯示小型 `material-symbols-outlined`（`forecastByDate[dateString].icon`，`text-[16px]`），`title` 屬性帶 `${wxText}・降雨機率 ${pop}%`。日期不在未來 7 天內的格子不受影響（因為 map 本身只有 7 筆，不需額外的日期範圍判斷）。
- 月頭既有的 `weatherIcon`（風險評分圖示）不變動、不移除 — 新圖示是額外疊加，不是取代。

### 6. 環境變數（`.env.example`）

```
# CWA_API_KEY: 中央氣象署開放資料平台會員授權碼 (opendata.cwa.gov.tw 免費申請)
# 未設定時：休市日行事曆的每日天氣預報圖示略過（不影響其他功能）
CWA_API_KEY=""
```

## 錯誤處理原則

- 缺 Key / CWA API 逾時或非 200 / JSON 結構不符預期 → 全部視為「無預報資料」，回傳空陣列，UI 端該 7 天格子單純不顯示圖示，**不**顯示錯誤訊息、**不**用假資料頂替（與 `weather-risk` route 用氣候平均值做 fallback 的做法不同 — 預報資料若造假，可能誤導使用者的進貨判斷，风险高於「目前觀測」的粗略估計，故此功能寧可顯示空白也不顯示假預報）。

## 範圍界線（Out of scope）

- 不動 `ProduceClient.tsx` 既有的「今日觀測」天氣卡片（county/temp/humidity/rainfall）— 那是另一個已上線的獨立功能。
- 不改動月頭既有的風險評分圖示邏輯。
- 不支援「全部市場」選項下的逐日預報（該選項本來就沒有單一縣市可對應，維持現況：不顯示每日圖示）。

## 測試計畫

- 無 `CWA_API_KEY` 時：確認 route 回傳 `{county, days: []}`、行事曆正常渲染、無圖示、無 console error 外洩到前端。
- 有 `CWA_API_KEY`（使用者之後自行設定）時：手動核對回傳的 7 天日期、icon、氣溫是否與 CWA 官方預報頁面一致。
- `market` 切換到「全部市場」：確認 forecast 被清空、不殘留上一個市場的圖示。
- 月份切換（上月／下月）：確認只有落在「今天起 7 天」內的格子顯示圖示，其餘月份不受影響。
