# 農時價 — UX / 設計審計報告

- 日期：2026-06-18
- 方法：`next dev` 啟動，以 Playwright (chromium) 對 8 個頁面在 **mobile 390×844** 與 **desktop 1440×900** 兩個斷點全頁截圖（共 16 張 + 1 張有資料的單品頁），逐頁檢視資訊層級、對比、間距、RWD、互動回饋與無障礙。
- 截圖目錄：[audit-screenshots/](audit-screenshots/)
- 截圖腳本：[scripts/ux-shots.mjs](scripts/ux-shots.mjs)

> 截圖注意：首次以 fullPage 截圖時，`whileInView` 動畫與 `dynamic()` 懶載入區塊（`民生物資行情`、`探索功能`、`更多實用工具推薦`、`本週走勢`）因視窗停在頂部未觸發，呈現整片空白。**這是截圖假象，非正式環境 bug**（真實使用者會捲動觸發）。腳本已加入自動捲動後再截圖，下方截圖為觸發後的真實畫面。

---

## 已直接修正（安全、低風險）

| # | 問題 | 檔案 | 修正 |
|---|---|---|---|
| F1 | 首頁 hero 折線圖日期/說明字 `rgba(255,255,255,0.28/0.38)`，在深綠 hero 上對比僅約 1.8–2.5:1，幾乎看不到 | [HomeClient.tsx:849,857,866](src/components/pages/HomeClient.tsx#L849) | 提高為 0.55 / 0.62 |
| F2 | 單品頁 hero 標籤「今日批發均價」`text-white/48`、產地背景小標 `text-white/40`、側欄標題 `text-white/50` 對比偏低 | [ProduceClient.tsx:636,694,698](src/components/pages/ProduceClient.tsx#L636) | 提高為 /65、/65、/60 |
| F3 | Logo 的 `eco` material-symbol 未標 `aria-hidden`，螢幕報讀器會多讀一次 ligature 文字 | [TopAppBar.tsx:146](src/components/layout/TopAppBar.tsx#L146) | 加 `aria-hidden="true"`（旁邊已有可見文字「農時價」） |
| F4 | 上方/底部導覽 `<nav>` 無無障礙名稱 | [TopAppBar.tsx:162](src/components/layout/TopAppBar.tsx#L162)、[BottomNav.tsx:26](src/components/layout/BottomNav.tsx#L26) | 加 `aria-label="主要導覽"` |

---

## 第二輪修正（H1 / H2 / M1 / M2 / M3 / L1 已全數處理）

> 下方「發現」清單為初版審計時的狀態與建議；以下為後續實作的修正與驗證結果。`build` 通過（exit 0），dev 端點實測通過。

| # | 修正內容 | 檔案 | 驗證 |
|---|---|---|---|
| **H1a** | 跨市場比價漲跌全為 0：`fetchSearchRecords` 已將每個 crop+market 收斂為最新日並算好 holiday-aware `priceChange`，markets 路由改為直接沿用，不再用「只有單日、找不到前一日」的錯誤重算；並移除會把近幾日全歸入 current 區間、導致沒有 baseline 的 `weekAgo` 參數 | [markets/route.ts](src/app/api/prices/markets/route.ts) | `/api/prices/markets?crop=九層塔` → 9/9 筆非 0（-2、9.4、6.7、-20.1、-31.5…） |
| **H1b** | 搜尋列表（多作物廣查詢）漲跌全為 0：MOA v1 API 有 1000 筆上限，廣查詢只回最新一天 → 無 baseline。新增 `fetchSearchBulkRecords`，近期區間優先改用未截斷的 OpenData feed（與 movers 同源，含多日），失敗才退回 v1 | [moa.ts](src/lib/server/moa.ts) (`fetchSearchBulkRecords`) | `/api/prices?type=Veg` → 1271/1542 筆非 0（原本 0/1000） |
| **H2** | 休市卡原始代碼在地化：`note` 由 `type.MarketType` 改為對應中文（V→蔬菜、F→水果、L→花卉、Fish→漁產；未知碼不顯示 badge） | [moa.ts:700+](src/lib/server/moa.ts#L700) `MARKET_TYPE_LABELS` / `localizeMarketType` | 截圖 [v2-insights-mobile](audit-screenshots/v2-insights-mobile.png) 顯示「漁產／水果」 |
| **M1** | 當季頁桌機空白：資料本身僅 3 筆（live + 內建皆同），新增「依分類探索更多行情」分類入口區（蔬菜/水果/菇類/花卉），把空白處填上真實導覽 | [seasonal/page.tsx](src/app/seasonal/page.tsx) | 截圖 [v2-seasonal-desktop](audit-screenshots/v2-seasonal-desktop.png) |
| **M2** | 溯源「佔位感」：資料其實為真（真實溯源編號＋縣市），但 `來源` 顯示原始 API endpoint 名、且 `生產者` 恆為「未揭露」。改為來源在地化（臺灣農產品生產追溯／產銷履歷），未揭露時隱藏生產者欄 | [moa.ts:909+](src/lib/server/moa.ts#L909) `TRACE_SOURCE_LABELS`、[ProduceClient.tsx:1003](src/components/pages/ProduceClient.tsx#L1003) | 截圖 [v2-produce-filled-desktop](audit-screenshots/v2-produce-filled-desktop.png) |
| **M3** | 標題階層：單品頁區塊標題 `h3→h2`（卡內列標 `h4→h3`）；搜尋頁價格篩選 `h3→h2`；設定／追蹤清單補上 `sr-only` 的 `h1`（不改視覺） | ProduceClient / SearchContent / SettingsClient / WatchlistClient | 視覺尺寸由 class 控制，無變化 |
| **L1** | 對比：`outline` token `#707a6c`（≈4.0:1）→ `#5c655a`（≈5.8:1，達 AA 小字 4.5:1）；深色模式 `text-outline` 另有覆寫，不受影響 | [tailwind.config.ts:58](tailwind.config.ts#L58) | — |

---

## 效能審計（查詢 / 資料層）

實測 dev API 延遲（cold = 首次、warm = 後續），標出無快取受益的熱點：

| Endpoint | 修正前 cold / warm | 修正後 cold / warm |
|---|---|---|
| `/api/prices/movers` | 19.0s / 18.0s | 19.0s / **0.22s** |
| `/api/prices?type=Veg` | 16.4s / 18.7s | 0.42s / **0.22s** |
| `/api/prices/markets` | 19.0s / 18.1s | 0.48s / **0.22s** |
| `/api/prices/overview` | 6.7s / 0.21s（已快取） | 共用快取後 cold 也降 |
| `/api/prices/history`、`/seasonal`、`/traceability`、`/cost` | 已正確走 `unstable_cache`，warm < 0.25s | — |

### ✅ 已修正

**P1（🔴 High）— `fetchRecentOpenData` 未快取，拖垮三個端點**
- movers／搜尋列表／跨市場比價都以 `fetchRecentOpenData()` 為共同 baseline 來源；該函式每次請求都對 MOA OpenData 做 **live fetch（~6999 筆、~1.43MB、15–19s）**，且無任何記憶體/資料快取 → 每次呼叫都重付全額成本。
- 修正：將其包進 `unstable_cache`（30 分 TTL、共用 key），所有呼叫者共享同一份結果。三個端點 warm 延遲由 **~18s 降到 <0.25s**；因共用快取，其中一個端點暖機後其餘端點 cold 也跟著變快（搜尋列表 cold 從 16s → 0.42s）。
- 檔案：[moa.ts](src/lib/server/moa.ts) — `fetchRecentOpenDataUncached` + `cachedRecentOpenData`（serialized 1.43MB，低於 Next data cache 2MB 上限，確認可被快取）。

### 🟠 建議（取捨/架構，未動手）

**P2（Medium）— 追蹤清單 N+1 請求**
- [WatchlistClient.tsx:87-92](src/components/pages/WatchlistClient.tsx#L87)：每個收藏作物各打 2 個請求（`/api/prices?crop=` + `/api/prices/history?crop=`），N 項 = 2N 個並發請求。server 端雖已快取（P1），但 client round-trips 隨清單長度線性成長。
- 建議：新增可一次帶多個 crop 的批次端點（或讓 `/api/prices` 支援多 crop 參數），把 2N 收斂為 1–2 個請求。屬 API 介面變更，未自行實作。

**P3（Low）— verbose 列表回應與 dead code**
- `/api/prices` 未帶 `format=array`/分頁時回傳冗長物件 JSON（`type=Veg` 約 304KB）。實際 App 走 `page=1&limit=20&format=array`（小）＋按需 `format=array` 全量，初載不受影響。
- [lib/api.ts:52](src/lib/api.ts#L52) `fetchPrices` 為 verbose 版本且**目前無呼叫者**（dead code）。建議移除，或讓未分頁回應預設 `format=array`。

**P4（Low）— 冷啟受資料同步新鮮度影響**
- 本機 `public/data/latest-opendata.json` 已過期（lastUpdated 2026-05-29），導致 `fetchRecentOpenData` 冷啟強制走 ~19s live fetch。正式環境若 cron 正常更新該檔，冷啟會直接讀本地檔而快。建議確認資料同步 job 運作正常，避免首位使用者卡在 movers 冷啟。

---

## 發現（初版審計狀態；H1/H2/M1/M2/M3/L1 已於上方修正）

### 🔴 High

**H1 — 搜尋列表與跨市場比價的漲跌幅永遠是 `+0.0%`**
- 證據：[search-mobile.png](audit-screenshots/search-mobile.png)、[produce-filled-desktop.png](audit-screenshots/produce-filled-desktop.png)（各區市場比價每一列都是 0.0%）；`GET /api/prices` 回傳的每筆 `priceChange` 皆為 0。
- 對照：首頁總覽 hero 與波動榜的漲跌幅是**正常**的（+11%、+46.6% 等），所以問題只在「列表 / 跨市場」這條資料路徑。
- 影響：漲跌是本站核心賣點，但在搜尋頁與單品比價區整片顯示 0.0%，看起來像壞掉、且讓 `TrendChip` 失去意義。
- 方向：檢查 [src/lib/server/moa.ts](src/lib/server/moa.ts) 列表聚合與 `/api/prices`、`/api/prices/markets` 的 `priceChange` 計算（是否取不到前一交易日、或休市日未回退）。CLAUDE.md 寫明此端點應回傳「真實 priceChange」，目前與規格不符。

**H2 — 洞察頁休市卡顯示未在地化的原始代碼「Fish」「F」**
- 證據：[insights-mobile.png](audit-screenshots/insights-mobile.png)、[insights-desktop.png](audit-screenshots/insights-desktop.png)。
- 根因：`note` 直接塞入 MOA 原始 `type.MarketType`（[moa.ts:785](src/lib/server/moa.ts#L785) → 顯示於 [InsightsClient.tsx:134](src/components/pages/InsightsClient.tsx#L134)）。同時市場名稱「台北」與「台北一」混用，使用者難判斷差異。
- 影響：英文/單字母代碼出現在中文介面，顯得未完成、降低信任。
- 方向：將 `MarketType` 對應為中文（如 漁產／蔬果），或無對應時隱藏該 badge。未直接修是因為代碼語意不明確（「F」可能指 Fruit 或 Farm），自行對應有貼錯標籤風險。

### 🟠 Medium

**M1 — 當季頁桌機版大量空白**
- 證據：[seasonal-desktop.png](audit-screenshots/seasonal-desktop.png)：1440 寬只放 3 張卡（2 欄），下方約 70% 視窗全空，像沒做完。
- 方向（設計取捨，未動手）：擴增當季品項、補充輔助內容，或限制內容最大寬度並置中、縮小空曠感。手機版（[seasonal-mobile.png](audit-screenshots/seasonal-mobile.png)）比例正常。

**M2 — 單品頁「產地溯源」是通用佔位資料**
- 證據：[produce-filled-mobile.png](audit-screenshots/produce-filled-mobile.png) 溯源卡片重複出現「生產者：未指定 · 來源：天然優選農品」等一致內容。
- 根因：fallback 文案（[moa.ts:2455](src/lib/server/moa.ts#L2455) 附近）。
- 影響：看起來像假資料/填充，反而傷信任。方向：無真實溯源資料時整段隱藏，而非顯示通用字串。

**M3 — 標題階層跳級（h1 → h3）**
- 單品頁等以 `<p class="section-kicker">` 當小標、區塊主標用 `<h3>`，但沒有 `<h2>`（如 [ProduceClient.tsx:603,714](src/components/pages/ProduceClient.tsx#L714)）。違反 WCAG 1.3.1 標題順序。
- 由於字級由 class 控制，將區塊 `<h3>` 升為 `<h2>` 不會改變視覺、屬低風險；但牽涉多處，列為建議由你確認後一次調整。

### 🟡 Low / Nits

**L1 — `outline` 文字色對比臨界**
- `outline = #707a6c`（[tailwind.config.ts:58](tailwind.config.ts#L58)）在白底約 4.0:1，略低於 WCAG AA 小字 4.5:1。用於搜尋 placeholder「搜尋作物…」與時間戳/小說明。
- 方向：將 token 調深至約 `#5c655a`（≈5:1）。因屬全站 token，未自動修，避免牽一髮。

**L2 — Onboarding 引導 modal**
- 每個新工作階段（清空 localStorage）都會在所有頁面彈出（[OnboardingModal.tsx](src/components/ui/OnboardingModal.tsx)），屬預期行為。建議補確認：焦點是否鎖在 modal 內、ESC 可關閉（鍵盤無障礙）。

**L3 —（非 bug，提醒）左下「N」圓形圖示是 Next.js dev 模式指示器**，僅開發時出現，會壓到手機底部導覽的「首頁」分頁；正式環境不會有，無需處理。

---

## 整體優點

- 視覺語言一致（liquid glass / 綠色品牌），手機間距節奏佳。
- 無障礙底子不錯：搜尋/通知有 `aria-label`、select 有 `sr-only` label、裝飾 icon 多已 `aria-hidden`、`touch-target` 尺寸。
- 空狀態（追蹤清單、無資料單品）與錯誤狀態（含「重新載入」CTA）處理完整。
- 價格用 `tabular-nums`、圖表 `connectNulls` 處理休市日，細節到位。
- 純 inline SVG 的 `CropIcon`，無破圖/alt 缺漏問題。

---

## 逐頁截圖索引

| 頁面 | Mobile | Desktop |
|---|---|---|
| 首頁 | [home-mobile](audit-screenshots/home-mobile.png) | [home-desktop](audit-screenshots/home-desktop.png) |
| 搜尋 | [search-mobile](audit-screenshots/search-mobile.png) | [search-desktop](audit-screenshots/search-desktop.png) |
| 當季 | [seasonal-mobile](audit-screenshots/seasonal-mobile.png) | [seasonal-desktop](audit-screenshots/seasonal-desktop.png) |
| 洞察 | [insights-mobile](audit-screenshots/insights-mobile.png) | [insights-desktop](audit-screenshots/insights-desktop.png) |
| 設定 | [settings-mobile](audit-screenshots/settings-mobile.png) | [settings-desktop](audit-screenshots/settings-desktop.png) |
| 追蹤清單 | [watchlist-mobile](audit-screenshots/watchlist-mobile.png) | [watchlist-desktop](audit-screenshots/watchlist-desktop.png) |
| 單品（無資料） | [produce-detail-mobile](audit-screenshots/produce-detail-mobile.png) | [produce-detail-desktop](audit-screenshots/produce-detail-desktop.png) |
| 單品（有資料·九層塔） | [produce-filled-mobile](audit-screenshots/produce-filled-mobile.png) | [produce-filled-desktop](audit-screenshots/produce-filled-desktop.png) |
| 分類中心 | [category-hub-mobile](audit-screenshots/category-hub-mobile.png) | [category-hub-desktop](audit-screenshots/category-hub-desktop.png) |
