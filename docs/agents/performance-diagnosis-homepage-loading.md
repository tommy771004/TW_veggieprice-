# 首頁初始化載入效能診斷報告

**性質：** 純診斷文件，不含程式碼變更（本文件本身的內容更新除外）。對應原始需求項目 1（分析載入效能問題、阻塞、讀取 JSON 檔案跟 API、以及程式寫法問題）。項目 2（載入進度條）已另行產出 spec 並排入 ticket，見 [spec-homepage-loading-bar.md](./spec-homepage-loading-bar.md)。

**更新記錄：** commit `e903d13`（2026-07-14）已修復 F1、F2、F3、F4，並已實作 `HomeLoadingBar` 元件與對應 E2E 測試。本次更新在原本的效能發現之外，新增「阻塞」與「程式寫法問題」兩個獨立段落，並將各項發現標註目前狀態。後續實作已修復殘留的 `require()`／`any` 型別標註，以及 O1/O2（假資料掩蓋錯誤改為明確錯誤回應）；`overview/trend` 同步移除假資料 fallback。

## 摘要

首頁 (`HomeClient`) 掛載時會平行發出 5–6 個獨立的 API 請求。原本有幾個明確的未快取熱點（F1–F4），加上本機開發環境（`next dev`）完全不受 CDN 層 `Cache-Control` 標頭保護，兩者疊加是「初始化 loading 太久」的主因——**這四項熱點目前均已修復**。殘留的程式寫法問題（`require()`／`any`／O1·O2 假資料）亦已處理。仍待評估的是架構層的取捨（F5、F6）。

## 判讀前提：你是在哪個環境感受到「載入太久」？

這份報告區分了兩類問題，嚴重程度會因環境而完全不同（此區分在理解「為什麼這樣修就夠了」時仍然有用，即使 F1–F4 現在都已修復）：

- **本機開發 (`next dev` / `localhost`)**：沒有 CDN 在前面擋，Route Handler 自己設的 `Cache-Control` 標頭形同虛設。只有 `unstable_cache` 包住的函式層級快取有效（Next.js 進程內快取，跟 CDN 無關）。修復前，F1、F3 會在本機每一次重新整理都以「完整未快取成本」執行；修復後兩者都已包進 `unstable_cache`，本機也能受惠。
- **Vercel 正式環境**：CDN 會依 `Cache-Control` 標頭快取回應。修復前只有 F2 在正式環境也完全不受保護；修復後已補上快取。

## 發現（效能／JSON＋API 讀取相關）

### ✅ F1 — `/api/prices/overview?category=seafood`（已修復）

- **原始位置：** [src/app/api/prices/overview/route.ts:29-46](src/app/api/prices/overview/route.ts#L29-L46)（成功路徑）與 [同檔 47-58 行](src/app/api/prices/overview/route.ts#L47-L58)（fallback 路徑）
- **原始現象：** 每次請求都用 `fs.promises.readFile` 讀取並 `JSON.parse` 整份 `public/data/latest-seafood.json`（約 1.7MB），且完全沒有設定 `Cache-Control` 標頭——任何環境下都是每次請求付出完整成本。
- **修復方式（commit `e903d13`）：** 讀檔邏輯抽到 `moa.ts` 的 `fetchLatestSeafoodDataUncached`，包進 `unstable_cache`（`revalidate: 3600`）匯出為 `fetchLatestSeafoodData()`；route handler 改呼叫這支共用函式，並補上 `SEAFOOD_CACHE_HEADERS`（`s-maxage=3600, stale-while-revalidate=7200`）在兩個回傳路徑上。`next.config.ts` 也另外針對 `category=seafood` 的查詢加了一條 headers 規則做雙重保障。

### ✅ F2 — `/api/markets/list?type=meat`（已修復）

- **原始位置：** `fetchMarkets` 的 meat 分支，[src/lib/server/moa.ts:541-568](src/lib/server/moa.ts#L541-L568)
- **原始現象：** 同步讀取並解析 `latest-livestock.json`（約 1.2MB），**兩層快取都沒有**——本報告中唯一「本機＋正式環境皆無保護」的路徑。
- **修復方式：** 抽成 `fetchLivestockMarketsUncached`，包進 `unstable_cache`（`["moa-livestock-markets-v1"]`，`revalidate: 3600`）匯出為 `fetchLivestockMarketsCached`；`fetchMarkets` 的 meat 分支現在直接回傳這支快取函式的結果。`markets/list/route.ts` 也補上了 `s-maxage=3600, stale-while-revalidate=7200` 標頭。

### ✅ F3 — `fetchMarketRestDays` 巢狀解析邏輯（已修復）

- **原始位置：** [src/lib/server/moa.ts:715-820](src/lib/server/moa.ts#L715-L820)，`HomeClient` 對**任何分類**都會呼叫，本機測試時影響最大的一項。
- **原始現象：** 外部 MOA fetch 有 `next: { revalidate: 3600 }` 快取，但市場 → 類型 → 年 → 月 → 日的四層巢狀解析/篩選邏輯完全沒包在 `unstable_cache` 裡，只靠 route 自己的 HTTP 標頭在正式環境緩解，本機開發完全沒保護。
- **修復方式：** 原函式改名為 `fetchMarketRestDaysUncached`（純邏輯不變），新增一層 `fetchMarketRestDays` 包住它，用 `unstable_cache`（key 為 `["moa-market-rest-days-v1", market, startDate, endDate]`，`revalidate: 1800`）——現在本機開發也能命中這層快取，不用每次重新整理都重跑巢狀迴圈。

### ✅ F4 — `/api/prices/movers?category=seafood`（已修復）

- **原始位置：** [src/app/api/prices/movers/route.ts:87-96](src/app/api/prices/movers/route.ts#L87-L96)
- **原始現象：** 同樣讀取 `latest-seafood.json`，函式層未快取，僅靠 CDN 標頭在正式環境緩解。
- **修復方式：** 改呼叫與 F1 共用的 `fetchLatestSeafoodData()`，移除了這支路由裡原本各自 `import path`/`import fs` 直接讀檔的重複程式碼。

## 🔵 阻塞（Event Loop Blocking）

這是這次補上的獨立段落——先前的報告把「阻塞」隱含在「未快取讀檔」的討論裡，沒有講清楚阻塞具體指什麼。

- **技術上的區分：** `fs.promises.readFile` 本身是**非同步**的，不會阻塞 Node.js 的事件迴圈；真正會阻塞的是它讀回字串後的 **`JSON.parse()`**——這是同步運算，處理 1–1.7MB 的字串時，會讓執行它的那個 serverless function instance 在解析期間**完全無法處理任何其他並發請求**，包括同一使用者的其他 API 呼叫或其他使用者打到同一 instance 的請求。`fetchMarketRestDays` 的四層巢狀迴圈解析也是同一類的同步 CPU-bound 阻塞。
- **修復後的現況：** F1–F4 全部包進 `unstable_cache` 之後，阻塞**發生的頻率**大幅降低——同一組快取 key（例如同一個 `market`）在 `revalidate` 時間窗內，不論有幾個並發請求進來，`JSON.parse`／巢狀解析都只會真正執行一次，其餘請求直接拿快取結果，不會觸發阻塞。
- **但要注意：** 這治的是「頻率」，不是「單次阻塞的嚴重度」。快取到期、第一個打進來的請求（cache miss）仍然要付出完整的同步解析成本，一樣會讓那個 instance 暫時無法服務其他請求。以目前的資料量（最大約 1.7MB），單次 `JSON.parse` 預期落在幾十毫秒等級，尚不到需要拆成串流解析或 worker thread 的程度，但如果未來這些 JSON 檔案持續成長（尤其 `market-rest-days.json` 已經 1.16MB、`latest-seafood.json` 已經 1.7MB），值得留意這個上限。
- **目前沒有找到**仍在「每一次 cache miss 都會阻塞、且沒有任何快取包裝」的路徑——F1–F4 是本次稽核範圍內找到的全部同類案例，都已修復。

## 🟣 程式寫法問題（Code Pattern Issues）

同樣是這次補上的段落。

- **✅ 已修復：重複的海鮮讀檔邏輯 + 函式中間 `require()`。** 修復前，`movers/route.ts` 用頂層 `import path from "path"; import fs from "fs"` 讀檔，`overview/route.ts` 則是在函式中間用 `const path = require('path'); const fs = require('fs')`——同一份 `latest-seafood.json` 的讀取/解析邏輯在兩個檔案裡各寫一份，且風格還不一致。這正符合 `CLAUDE.md` 自己記載的慣例（「新增 API 端點時，優先擴充 `src/lib/server/moa.ts`，避免在 Route Handler 內重複寫 fetch 與日期轉換」）所要避免的狀況。修復後兩處都改呼叫 `moa.ts` 匯出的 `fetchLatestSeafoodData()`，重複與風格不一致都一併解決。

- **✅ 已修復：`overview/route.ts` 函式中間的 `require()`。** 假資料 fallback 已移除，`subtractDays` 的 mid-function `require` 一併消失；`overview/trend/route.ts` 同樣改為頂層 ES import。

- **✅ 已修復：海鮮記錄改用 `SeafoodRawRecord` 型別。** `overview/route.ts` 與 `movers/route.ts` 讀取海鮮欄位時皆改為 `SeafoodRawRecord`，不再使用 `r: any`。

- **✅ 已修復（原報告的 O1/O2）：不再用假資料掩蓋失敗狀態。**
  - **O1：** 蔬菜/水果分類若 `fetchMarketOverviewTrend` 回傳 0 筆或錯誤，`overview/route.ts` 改回傳 `{ error }` 與 404/502，不再以市場名稱字元碼種子產生虛構均價。
  - **O2：** 漁產分類讀檔失敗回 502、該市場查無資料回 404，不再回寫死的均價 150／交易量 5000。
  - **順帶：** `overview/trend` 的蔬菜/水果假趨勢 fallback 同步移除；漁產趨勢尚未有真實歷史序列，改回空陣列（HTTP 200）避免隨機假線。海鮮 overview 成功路徑欄位對齊 `MarketOverview`（`marketName`／`totalVolume`）。
  - **前端：** `HomeClient` 既有的 `ovResult.value.ok`／`overviewError` 邏輯無需改動即可顯示錯誤狀態。

## 尚未處理的架構層發現

以下兩項在原報告中就標註為「架構層決定，非缺陷」，這次沒有變動，仍建議另外討論：

### 🟡 F5 — 首頁掛載時平行發出 5–6 個獨立請求，無合併

- **位置：** [src/components/pages/HomeClient.tsx](src/components/pages/HomeClient.tsx) 內 4 個獨立的 `useEffect`：市場清單、波動榜、休市日+天氣風險、市場概況+週趨勢。
- **現象：** 各 `useEffect` 內部已用 `Promise.allSettled` 平行化，但跨 4 個 `useEffect` 彼此獨立觸發，等於同時對 Vercel 開 5–6 條個別 serverless function 呼叫，各自可能有獨立 cold start。
- **建議：** 若要處理，方向是新增彙總端點（例如 `/api/prices/home-bootstrap`），但這會動到 `CLAUDE.md` 記載的 Route Handler 對照表，屬於架構層決定，建議另外討論再動手。
- **預估工作量：** L（大）

### 🟡 F6 — `page.tsx` 刻意不做 SSR 資料預取（既有設計決策，非缺陷）

- **位置：** [src/app/page.tsx:19-28](src/app/page.tsx#L19-L28)，程式碼內已有註解說明原因（fast TTFB）。
- **現象：** 這正是為什麼使用者會看到 skeleton 畫面持續數秒的根本原因——不是「壞掉」，是既有取捨的直接後果。
- **建議：** 不建議現在改動；若之後要重新評估，建議先補一份 ADR 記錄現況的取捨脈絡。
- **預估工作量：** 不適用（建議先決策）

## 優先順序建議

1. F1–F4 已於 commit `e903d13` 修復，無需再處理。
2. 殘留 `require()`／`any` 與 O1/O2 已修復，無需再處理。
3. 剩餘項目：
   - **F5、F6**——架構層決定，建議另開討論，不建議跟小修小補一起處理。

## 不在此份診斷範圍內

- 不含 Vercel serverless cold start 的實際量測數據——需要正式環境的監控/日誌數據才能判斷實際發生頻率與時長，本報告僅指出結構性風險（F5）。
- 不含首頁以外頁面（搜尋頁、作物詳情頁等）的效能稽核。`fetchSearchRecords` 的肉品/漁產分支有相同的未快取讀檔模式（[src/lib/server/moa.ts:1757, 1950](src/lib/server/moa.ts#L1757)），但不在「首頁初始化載入」範圍內，故未展開分析。
- F5（bootstrap 彙總端點）、F6（SSR 預取取捨）仍屬架構決策，未在本次實作範圍內。
