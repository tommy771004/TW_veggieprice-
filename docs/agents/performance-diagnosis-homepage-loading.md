# 首頁初始化載入效能診斷報告

**性質：** 純診斷文件，不含程式碼變更。對應原始需求項目 1（分析載入效能問題）。項目 2（載入進度條）已另行產出 spec 並排入 ticket，見 [spec-homepage-loading-bar.md](./spec-homepage-loading-bar.md)。

## 摘要

首頁 (`HomeClient`) 掛載時會平行發出 5–6 個獨立的 API 請求，其中多數的資料層函式已用 `unstable_cache` 妥善快取；但仍有**幾個明確的未快取熱點**，加上**本機開發環境（`next dev`）完全不受 CDN 層 `Cache-Control` 標頭保護**，兩者疊加很可能就是「初始化 loading 太久」的主因。以下依嚴重程度列出具體發現，附檔案位置與行號。

## 判讀前提：你是在哪個環境感受到「載入太久」？

這份報告裡有兩類問題，嚴重程度會因環境而完全不同：

- **本機開發 (`next dev` / `localhost`)**：沒有 CDN 在前面擋，所有 Route Handler 自己設的 `Cache-Control` 標頭形同虛設（沒有代理伺服器會去讀它）。只有 `unstable_cache` 包住的函式層級快取還有效（那是 Next.js 進程內快取，跟 CDN 無關）。**這種情況下，發現 F1、F3 會在每一次重新整理都以「完整未快取成本」執行。**
- **Vercel 正式環境**：CDN 會依 `Cache-Control` 標頭快取回應。多數發現在正式環境會被大幅緩解（見各項的「正式環境影響」）。**只有發現 F2 在正式環境也完全不受保護。**

若你是在本機測試時注意到這個問題，請優先看 F1 與 F3；若正式環境本身就慢，請優先看 F2，並檢查 F5（平行請求數量）與 Vercel function 的 cold start。

## 發現

### 🔴 F1 — `/api/prices/overview?category=seafood` 完全無快取（本機＋正式環境皆然）

- **位置：** [src/app/api/prices/overview/route.ts:29-46](src/app/api/prices/overview/route.ts#L29-L46)（成功路徑）與 [同檔 47-58 行](src/app/api/prices/overview/route.ts#L47-L58)（fallback 路徑）
- **現象：** 每次請求都用 `fs.promises.readFile` 同步讀取並 `JSON.parse` 整份 `public/data/latest-seafood.json`（約 1.7MB），然後在記憶體中 `filter`/`reduce` 全部記錄。
- **關鍵問題：** 這兩個 `return NextResponse.json(...)` **都沒有設定任何 `Cache-Control` 標頭**——同檔案最下面蔬菜/水果路徑有設 `s-maxage=120`（[第 131-138 行](src/app/api/prices/overview/route.ts#L131-L138)），但海鮮分支完全沒有。也不像 `movers` 路由的海鮮分支那樣至少有 `s-maxage=3600`。
- **影響：** 只要使用者把首頁分類切到「漁產」，這支 API 在任何環境下都是**每次請求都付出完整讀檔+解析成本**，沒有任何一層快取保護。
- **建議修法：** 比照 `movers/route.ts` 加上 `Cache-Control: public, s-maxage=3600` 標頭，或直接用 `unstable_cache` 包住海鮮資料讀取（比照 `fetchRecentOpenDataUncached` 的作法）。
- **預估工作量：** S（小）

### 🔴 F2 — `/api/markets/list?type=meat` 完全無快取（本機＋正式環境皆然）

- **位置：** `fetchMarkets` 的 meat 分支，[src/lib/server/moa.ts:541-568](src/lib/server/moa.ts#L541-L568)，由 [src/app/api/markets/list/route.ts](src/app/api/markets/list/route.ts) 呼叫
- **現象：** 同步讀取並解析 `public/data/latest-livestock.json`（約 1.2MB），逐筆組出市場名稱清單。
- **關鍵問題：** 這個函式**沒有 `unstable_cache` 包裝**，呼叫它的 route handler 也**完全沒有設定任何 `Cache-Control` 標頭**——是本報告中唯一一個「兩層快取都沒有」的路徑。
- **影響：** 使用者把首頁分類切到「肉品家禽」時，每次都要付出完整讀檔+解析成本，不論本機或正式環境。
- **建議修法：** 用 `unstable_cache`（比照同檔案中 Veg/Fruit 分支的作法，`revalidate: 3600` 即可，因為市場清單很少變動）包住這個分支。
- **預估工作量：** S（小）

### 🟠 F3 — `fetchMarketRestDays` 的巢狀解析邏輯每次呼叫都重算（本機環境下影響最大，且在**預設分類下就會觸發**）

- **位置：** [src/lib/server/moa.ts:715-820](src/lib/server/moa.ts#L715-L820)，由 [src/app/api/insights/rest-days/route.ts](src/app/api/insights/rest-days/route.ts) 呼叫，`HomeClient` 在 `loadMarketStaticInsights` 中對**任何分類**都會呼叫（[src/components/pages/HomeClient.tsx:270-304](src/components/pages/HomeClient.tsx#L270-L304)）。
- **現象：** 對外部 MOA 兩支 WCF 端點的 `fetch()` 有 `next: { revalidate: 3600 }`，這層 fetch 本身有快取。但拿到回應後，市場 → 類型 → 年 → 月 → 日的四層巢狀迴圈解析/篩選邏輯**完全沒有包在 `unstable_cache` 裡**，每次呼叫都重新跑一次。
- **正式環境影響：** Route handler 自己設了 `Cache-Control: public, s-maxage=1800, stale-while-revalidate=7200`（[route.ts:19-23](src/app/api/insights/rest-days/route.ts#L19-L23)），所以在 Vercel 上會被 CDN 依 `(market, startDate, endDate)` 快取 30 分鐘——多數請求不會真的命中這段解析邏輯。
- **本機環境影響：** `next dev` 沒有 CDN，這段解析**每次重新整理首頁都會完整跑一遍**，而且不像 F1/F2 只在切換分類時發生——這是**任何分類、每次載入首頁都會觸發**的路徑，本機測試時很可能是最有感的一項。
- **建議修法：** 把解析/篩選邏輯本身也包進 `unstable_cache`（key 用 `market/startDate/endDate`），而不是只靠外層 route 的 HTTP 標頭。這樣本機開發時也能受惠。
- **預估工作量：** M（中，牽涉重構函式邊界，把「外部 fetch」與「純運算」拆開分別快取）

### 🟠 F4 — `/api/prices/movers?category=seafood` 讀檔未於函式層快取（正式環境有 CDN 緩解）

- **位置：** [src/app/api/prices/movers/route.ts:87-96](src/app/api/prices/movers/route.ts#L87-L96)
- **現象：** 同樣同步讀取+解析 `latest-seafood.json`（約 1.7MB），但這裡至少有設 `Cache-Control: public, s-maxage=3600`（[第 175-176 行附近](src/app/api/prices/movers/route.ts)），正式環境下會被 CDN 快取一小時。
- **影響：** 本機開發時每次切到漁產分類都要付出完整成本；正式環境下風險較低。
- **建議修法：** 同 F1，改用 `unstable_cache` 做函式層記憶體快取，讓本機開發也受益，而不是只靠 CDN 標頭。
- **預估工作量：** S（小）

### 🟡 F5 — 首頁掛載時平行發出 5–6 個獨立請求，無合併

- **位置：** [src/components/pages/HomeClient.tsx](src/components/pages/HomeClient.tsx) 內共 4 個獨立的 `useEffect`：市場清單（[225 行](src/components/pages/HomeClient.tsx#L225)）、波動榜（[251 行](src/components/pages/HomeClient.tsx#L251)）、休市日+天氣風險（[270-304 行](src/components/pages/HomeClient.tsx#L270-L304)，內部已用 `Promise.allSettled` 平行）、市場概況+週趨勢（[313-320 行](src/components/pages/HomeClient.tsx#L313-L320)，同樣用 `Promise.allSettled`）。
- **現象：** 雖然同一個 `useEffect` 內部已經平行化（`Promise.allSettled`），但跨 4 個 `useEffect` 之間彼此獨立觸發，等於瀏覽器同時對 Vercel 開 5–6 條個別的 serverless function 呼叫，各自可能有獨立的 cold start。
- **影響：** 不算「錯誤」，但比起單一個彙總端點回傳所有首頁所需資料，目前架構在網路延遲、TLS 交握、function 冷啟動上的總開銷會比較高，尤其在行動網路或 Vercel cold start 情境下更明顯。
- **建議修法：** 若要處理，方向是新增一個彙總端點（例如 `/api/prices/home-bootstrap`）在伺服器端平行呼叫現有資料層函式後一次回傳；但這會改變目前 CLAUDE.md 記載的 Route Handler 對照表，屬於架構層決定，建議另外討論再動手，不建議在這份診斷之外直接執行。
- **預估工作量：** L（大，新端點+前端改寫+文件同步更新）

### 🟡 F6 — `page.tsx` 刻意不做 SSR 資料預取（既有設計決策，非缺陷）

- **位置：** [src/app/page.tsx:19-28](src/app/page.tsx#L19-L28)，程式碼內已有註解說明：「Return early without blocking on network requests to guarantee extremely fast TTFB」
- **現象：** 首頁的 Server Component 直接回傳空殼，所有資料都交給 `HomeClient` 掛載後才用 `fetch` 取得——這正是為什麼使用者會看到 skeleton 畫面持續數秒的根本原因，而不是某個地方「壞掉」了。
- **影響：** 這個設計用 TTFB（Time To First Byte）指標換取了「感知載入時間」——伺服器很快回應，但畫面實際填滿內容仍需等待前端的請求瀑布跑完。使用者感受到的「loading 太久」，某種程度上就是這個既有取捨的直接後果。
- **建議：** 不建議現在改動（牽涉 SSR/TTFB 取捨的架構決策，且目前沒有 ADR 記錄這個決定的理由）。如果之後要重新評估「要不要犧牲 TTFB 換取首屏就有資料」，建議先補一份 ADR 記錄現況的取捨脈絡，再做決定。
- **預估工作量：** 不適用（建議先決策，非直接修復項目）

## 附帶發現（非效能問題，但在稽核過程中發現，一併回報）

在讀取 [src/app/api/prices/overview/route.ts](src/app/api/prices/overview/route.ts) 的過程中，順帶發現兩處資料正確性相關的邏輯，跟載入效能無關，但因為就在同一支檔案裡，一併記錄供你評估是否要另外處理：

- **O1：** 蔬菜/水果分類若 `fetchMarketOverviewTrend` 回傳 0 筆資料，程式碼會用「市場名稱字元碼加日期」當種子產生一組看起來合理但完全虛構的價格資料（[第 82-108 行](src/app/api/prices/overview/route.ts#L82-L108)），而不是回傳錯誤狀態。前端會把這組假資料當成真實市場均價顯示。
- **O2：** 漁產分類若讀檔失敗或該市場查無資料，會回傳寫死的假資料（均價 150、交易量 5000，[第 51-58 行](src/app/api/prices/overview/route.ts#L51-L58)）。

這兩點不影響載入速度，但可能影響資料可信度，是否要處理請你自行判斷——不在本次「載入效能」診斷的範圍內，這裡僅止於回報觀察到的事實。

## 優先順序建議

若要著手修復，建議順序（依「風險是否在任何環境都存在」與修復成本排序）：

1. **F2**（肉品市場清單，任何環境都無保護，修法簡單）
2. **F1**（海鮮市場概況，任何環境都無保護，修法簡單）
3. **F3**（休市日解析，本機開發影響最大且觸及所有分類，修法中等）
4. **F4**（海鮮波動榜，正式環境已有緩解，修法簡單，可與 F1 一起處理）
5. F5、F6 屬於架構層決定，建議另開討論，不建議跟前 4 項一起小改動處理

## 不在此份診斷範圍內

- 不含任何程式碼修改（依先前確認，本文件僅為診斷報告）。
- 不含 O1、O2 的修復決策（僅回報，留待你決定是否處理）。
- 不含 Vercel serverless cold start 的實際量測數據——這需要正式環境的監控/日誌數據，無法單靠讀程式碼判斷實際發生頻率與時長，本報告僅指出「架構上存在多個獨立 function 呼叫、會放大 cold start 影響」這個結構性風險。
- 不含首頁以外頁面（搜尋頁、作物詳情頁等）的效能稽核，雖然 `fetchSearchRecords` 的肉品/漁產分支有相同的未快取讀檔模式（[src/lib/server/moa.ts:1757, 1950](src/lib/server/moa.ts#L1757)），但不在「首頁初始化載入」的範圍內，故未展開。
