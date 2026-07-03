# 農時價 — UX / 設計審計報告

- **日期**：2026-06-17
- **環境**：`npm run dev` @ `http://localhost:3000`（Next.js 15.5.15）
- **方法**：Playwright 逐頁全頁截圖，三個斷點 — mobile `390px`、tablet `768px`、desktop `1280px`
- **涵蓋頁面**：首頁 `/`、搜尋 `/search`、當季 `/seasonal`、洞察 `/insights`、關注 `/watchlist`、設定 `/settings`、單品 `/produce/[id]`、分類 `/produce/category/[category]`
- **截圖**：見本資料夾 `*-{mobile,tablet,desktop}.png`（共 24 張）

> 截圖時已用 `localStorage` 略過新手導覽（`veggieprice_onboarding_seen`），並自動捲動觸發 lazy section，使資料完整載入後再擷取。

---

## 更新（後續修正）

原列為「僅建議」的 H1 / H2 / M1 / M2 / M3 / M4 經確認後**已全部實作並通過 build**，驗證截圖見 `after/`：

| 項 | 修正內容 | 主要檔案 |
|---|---|---|
| **H1** | 呈現層：`avgPrice<=0` 不印 `$0.0`，全 0 時顯示「今日各市場暫無此作物成交價」。**根因層**：`markets` route 改跳過 `avgPrice<=0`／休市佔位列，改用各市場最近一筆「有成交價」的紀錄，逢休市日不再整欄歸 0 | [ProduceClient.tsx](../src/components/pages/ProduceClient.tsx)、[prices/markets/route.ts](../src/app/api/prices/markets/route.ts) |
| **L4** | 單品價格趨勢改以 `validHistory`（非 null 點）判斷空狀態 — 整週休市時不再畫出空白圖，改顯示「近期無成交資料（可能逢休市），請改看較長區間」 | [ProduceClient.tsx](../src/components/pages/ProduceClient.tsx) |
| **H2** | client 改打既有 server route `/api/insights/rest-days`（不再下載 18k 筆）；洞察頁預設改單一市場「台北一」+ 分頁「載入更多」。mobile 頁高 68,380px → ~3,800px | [api.ts](../src/lib/api.ts)、[InsightsClient.tsx](../src/components/pages/InsightsClient.tsx) |
| **M1** | 手機底部導覽加入「關注」（6 項，未犧牲任何 tab，cap 寬度 340→392px） | [BottomNav.tsx](../src/components/layout/BottomNav.tsx) |
| **M2** | 頂部與搜尋頁自動完成補 `role=combobox/listbox/option`、`aria-expanded/controls/activedescendant` 與上下鍵/Enter/Esc 鍵盤操作 | [TopAppBar.tsx](../src/components/layout/TopAppBar.tsx)、[SearchContent.tsx](../src/components/pages/SearchContent.tsx) |
| **M3** | 新手導覽 Modal 加 focus trap、Esc 關閉、開啟移入/關閉還原焦點 | [OnboardingModal.tsx](../src/components/ui/OnboardingModal.tsx) |
| **M4** | 新增 `townshipCountyMap`（僅收錄不歧義的鄉鎮→縣市），weather route 與 `resolveOrigin` 串接 `marketCountyMap`+`townshipCountyMap`；五股區→新北、氣象查得到、產地顯示為縣市層級 | [townshipCountyMap.ts](../src/lib/server/townshipCountyMap.ts)、[weather/route.ts](../src/app/api/weather/route.ts)、[produce/info/route.ts](../src/app/api/produce/info/route.ts) |

> 殘留（非程式問題）：部分作物（如高麗菜、大白菜）近 7 日 MOA 資料全為休市/無成交，因此比價與趨勢正確地顯示「暫無成交」空狀態 — 這是上游資料稀疏，非 bug。
>
> 仍為「僅建議」未動手：**L1**（英雄卡淡標籤對比，屬玻璃美學取捨）、**L2**（裝飾圖示 `aria-hidden` 全面清理，已修關鍵者）、**L3**（關注移除鍵的實心愛心，屬「已收藏狀態」的可辯護設計）。

---

## 總評

整體完成度高：一致的 Liquid Glass 設計語言、合理的資訊密度、RWD 在三個斷點都成立、動畫克制且尊重 `prefers-reduced-motion`、多數表單控制項有 `label`/`aria-label`、空狀態與錯誤狀態都有設計。下列問題以**嚴重度**排序，已直接修掉的低風險項列在最後。

---

## 🔴 High（影響理解 / 可信度，建議優先處理）

### H1. 單品「各區市場比價」整欄顯示 `$0.0`
- **現象**：`/produce/高麗菜` 的「各區市場比價」每一個市場都顯示 `$0.0`、漲跌 0%。
- **證據**：`produce-detail-desktop.png`（右欄）、`produce-detail-mobile.png`（下段）。API 實測：
  `GET /api/prices/markets?crop=高麗菜&type=Veg` → 每筆 `"avgPrice":0,"priceChange":0`。
- **影響**：使用者看到一整排 `$0.0` 會誤判「全台高麗菜都不要錢」或「網站壞了」，傷害可信度。
- **位置**：呈現端 [ProduceClient.tsx:945-979](../src/components/pages/ProduceClient.tsx#L945-L979)；資料端 `/api/prices/markets` route handler + [moa.ts](../src/lib/server/moa.ts)。
- **建議（屬資料/邏輯，未動手）**：
  1. 先查 `markets` 端點為何回傳 0（多半是「當日無此作物成交」卻仍輸出 0，而非過濾掉）。
  2. UI 層：`avgPrice <= 0` 的市場應顯示「查無今日資料」或直接隱藏，不要印 `$0.0`。

### H2. 洞察頁「全部市場」產生超長列表（手機 ~68,000px）並把整包 JSON 丟到前端
- **現象**：`/insights` 預設市場為「全部市場」+ 前後 30 天，會渲染數百張休市卡片；mobile 全頁截圖高度達 **68,380px**（`insights-mobile.png` 是一條極長的圖）。
- **證據**：`insights-mobile.png`（異常長）。資料檔 `GET /data/market-rest-days.json` 共 **18,046 筆**，整包下載後在前端用 `Array.filter` 篩選。
- **影響**：手機上無限捲動、無分組/分頁；同時下載 18k 筆 JSON 拖慢首屏與記憶體。
- **位置**：[InsightsClient.tsx:110-129](../src/components/pages/InsightsClient.tsx#L110-L129)、[api.ts:118-153](../src/lib/api.ts#L118-L153)（client-side 過濾整包檔案）。
- **建議（屬架構/設計，未動手）**：
  1. 預設改為單一市場（或「我的預設市場」），而非「全部市場」。
  2. 依日期/市場分組 + 分頁或「載入更多」。
  3. 過濾移到 server route handler，前端只取需要的區間，避免下載 18k 筆。

---

## 🟠 Medium

### M1. 手機底部導覽缺少「關注」入口 → watchlist 在手機上無法從常駐導覽到達
- **現象**：桌機頂部導覽有 6 項（含「關注」），手機底部膠囊只有 5 項（首頁/搜尋/當季/洞察/設定），**沒有「關注」**。手機使用者只能靠單品頁的愛心或直接打網址才能進 `/watchlist`。
- **證據**：`watchlist-mobile.png`（底部 5 顆 tab 無「關注」）。
- **位置**：[BottomNav.tsx:6-12](../src/components/layout/BottomNav.tsx#L6-L12) vs [TopAppBar.tsx:10-17](../src/components/layout/TopAppBar.tsx#L10-L17)。
- **建議（屬資訊架構取捨，未動手）**：關注是核心功能，建議納入底部列（可考慮把「洞察」收進更多選單，或改 5→可滑動，或在頂部 bar 補一個關注 icon）。取捨在於要犧牲哪一個 tab，故僅建議。

### M2. 全域搜尋自動完成缺少 combobox 無障礙語意
- **現象**：頂部 bar 與搜尋頁的自動完成清單是 `div + button`，沒有 `role="listbox"/"option"`、`aria-expanded`、`aria-controls`、`aria-activedescendant`，也無方向鍵選取。
- **影響**：螢幕報讀器與鍵盤使用者無法得知/操作建議清單。
- **位置**：[TopAppBar.tsx:163-203](../src/components/layout/TopAppBar.tsx#L163-L203)、[SearchContent.tsx:369-382](../src/components/pages/SearchContent.tsx#L369-L382)。
- **建議（屬較大 a11y 重構，未動手）**：套用 WAI-ARIA combobox pattern，或改用既有無障礙元件。

### M3. 新手導覽 Modal 無 focus trap / 無 Esc 關閉 / 開啟時焦點未移入
- **現象**：`role="dialog" aria-modal` 已標示，但鍵盤 Tab 仍會跑到背後內容、按 Esc 不會關、開啟時焦點沒移進對話框。
- **位置**：[OnboardingModal.tsx:59-127](../src/components/ui/OnboardingModal.tsx#L59-L127)。
- **建議（未動手）**：加入焦點移入/限制、Esc 關閉、關閉後焦點還原。

### M4. 產地氣象：產地是「區」層級時永遠對不到縣市，導致氣象區塊常態失敗
- **現象**：`/produce/高麗菜` 顯示「產地氣象 (五股區)」，但 `五股區` 不在 `VALID_COUNTIES`（縣市層級），API 回 404。
- **位置**：[weather/route.ts:22-24](../src/app/api/weather/route.ts#L22-L24)。
- **狀態**：**已修掉「英文錯誤訊息外洩」的呈現問題**（見 F5）；但「區→縣市」對應的根因仍在，建議補一層 行政區→縣市 對照，讓氣象真的查得到。

---

## 🟡 Low

### L1. 對比：英雄卡上的淺色說明文字偏低（WCAG AA 邊緣/未達）
- **現象**：深綠英雄卡上的小型 uppercase 標籤用 `text-white/48`、`text-white/40`（如「今日批發均價 · 元 / 公斤」、走勢日期），實測對比約 **3.5:1**，小字 AA 需 4.5:1。白底上的 `#707a6c`（`text-outline`）小字約 **4.5:1**，僅勉強過關。
- **位置**：[ProduceClient.tsx:633](../src/components/pages/ProduceClient.tsx#L633)、[HomeClient.tsx:846-871](../src/components/pages/HomeClient.tsx#L846-L871)。
- **建議（與「液態玻璃」淡標籤的設計意圖有取捨，故僅建議）**：把英雄卡淡標籤從 `white/40~48` 提到 `white/65~70`。

### L2. 裝飾性 Material Symbols 字符未一致標 `aria-hidden`
- **現象**：部分圖示（如搜尋空狀態 `search_off`）未標 `aria-hidden`，報讀器會唸出 ligature 文字（如「search_off」）。本次已修掉數個最關鍵的（見 F1/F3/F4/F7/F8），其餘屬同類批次清理。
- **位置**：例 [SearchContent.tsx:687](../src/components/pages/SearchContent.tsx#L687) 及散落各處。
- **建議**：對所有「純裝飾」圖示統一補 `aria-hidden="true"`。

### L3. 「移除關注」用實心愛心當刪除鍵，語意略矛盾
- **現象**：關注卡右上的移除鍵是實心 `favorite`（愛心），愛心通常代表「已收藏」而非「刪除」；已有 `aria-label="移除 X"` 故功能無礙，但視覺語意易誤解。
- **位置**：[WatchlistClient.tsx:281-292](../src/components/pages/WatchlistClient.tsx#L281-L292)。
- **建議**：刪除動作改用 `close`/`delete`/`heart_minus` 之類更直覺的圖示。

### L4. 單品 1 週走勢在資料稀疏時近乎空白
- **現象**：`/produce/高麗菜` 的「價格趨勢」圖在 1W 期間只有座標軸、幾乎沒有線（資料點少）。
- **證據**：`produce-detail-desktop.png`（趨勢圖區）。
- **建議**：資料點 < 2 時顯示明確的「資料不足」提示（目前 0 筆才提示），或自動退回較長區間。

---

## ✅ 已直接修正（低風險：alt/標籤、文字外洩、地標語意）

| # | 問題 | 檔案:行 | 修正 |
|---|------|---------|------|
| F1 | `TrendChip` 漲跌箭頭字符未 `aria-hidden`，報讀器唸出「arrow_upward」 | [TrendChip.tsx:21](../src/components/ui/TrendChip.tsx#L21) | 箭頭加 `aria-hidden="true"`（全站漲跌晶片受惠） |
| F2 | 洞察頁在 layout 的 `<main>` 內又渲染一個 `<main>`（重複 landmark） | [InsightsClient.tsx:41](../src/components/pages/InsightsClient.tsx#L41) | 外層 `<main>` 改 `<div>`，視覺不變 |
| F3 | 單品頁返回鈕為純圖示、無可及名稱 | [ProduceClient.tsx:564](../src/components/pages/ProduceClient.tsx#L564) | 加 `aria-label="返回上一頁"`、圖示 `aria-hidden` |
| F4 | 單品頁左右捲動鈕用英文 `aria-label`（"Scroll left/right"）於 zh-TW 介面 | [ProduceClient.tsx:657](../src/components/pages/ProduceClient.tsx#L657) | 改「向左捲動 / 向右捲動」，圖示 `aria-hidden` |
| F5 | 產地氣象把原始英文 API 錯誤 `No matching county found in origin` 直接顯示給使用者 | [ProduceClient.tsx:839](../src/components/pages/ProduceClient.tsx#L839) | 非中文錯誤改顯示「查無此產地的氣象資料」 |
| F6 | 設定頁開關鈕無可及名稱（label 在旁邊的 div，未關聯） | [SettingsClient.tsx:262](../src/components/pages/SettingsClient.tsx#L262) | 改 `role="switch"` + `aria-checked` + `aria-label` |
| F7 | 搜尋頁價格篩選鈕為純圖示、無 `aria-label`/`aria-expanded` | [SearchContent.tsx:357](../src/components/pages/SearchContent.tsx#L357) | 加 `aria-label`、`aria-expanded`，圖示 `aria-hidden` |
| F8 | 頂部通知鈕無 `aria-expanded` | [TopAppBar.tsx:207](../src/components/layout/TopAppBar.tsx#L207) | 加 `aria-expanded`，圖示 `aria-hidden` |

> 全部屬「alt 文字 / 無障礙標籤 / 文字外洩 / 地標語意」類的安全修正，不改版面與商業邏輯。H1/H2/M1–M4/L1 等涉及資料、架構或設計取捨，依指示僅提建議、未動手。

---

## 各頁面速記

- **首頁**：資訊層級清楚（英雄卡→波動榜→民生物資→走勢/當季→探索→FAQ）。桌機/手機/平板皆穩。
- **搜尋**：篩選列可橫向捲動、分頁完整、空/錯誤狀態齊全；selects 與 input 皆有 `aria-label`。
- **當季**：Server component，乾淨；卡片清楚。
- **洞察**：見 H2（預設「全部市場」列表過長）。
- **關注**：空狀態 CTA 清楚；卡片資訊密度佳。見 M1（手機導覽缺入口）。
- **設定**：分區清楚、字級/主題即時預覽佳；selects 有 `label`。
- **單品**：資訊很完整（趨勢/量能/簡介/氣象/成本/比價/追溯）。見 H1（比價 $0.0）、M4、L4。
- **分類**：兩欄作物清單清楚，RWD 正常。
