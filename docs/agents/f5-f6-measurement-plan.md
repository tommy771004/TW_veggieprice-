# F5 / F6 量測計畫（決策前置）

**狀態：** 基線已完成（2026-07-14）；F6 上線後需複測  
**目的：** 在實作任何首頁資料拓樸變更前，收集正式環境（或接近正式的 Preview）數據，供 [ADR-0001](../adr/0001-homepage-data-fetch-topology.md) 決策場使用。  
**範圍：** 僅首頁 (`/`) 初始化與切市場／分類的後續請求；不含搜尋頁、作物詳情頁。  
**Production URL：** https://tw-veggieprice.vercel.app/

相關診斷：[performance-diagnosis-homepage-loading.md](./performance-diagnosis-homepage-loading.md)（F5、F6）

---

## 1. 為什麼先量測

F1–F4 已處理「單次請求內的未快取成本」。F5／F6 回答的是另一層問題：

| 代號 | 問題 | 沒有數據時容易誤判 |
|------|------|--------------------|
| **F5** | Client 要打幾槍 API？要不要合併？ | 以為 6 請求一定慢，其實 CDN 已夠快 |
| **F6** | 第一次 paint 前要不要 SSR 預取？ | 為了「有資料」犧牲 TTFB，但用戶其實更在意 TTFB |

**原則：** 量測 → ADR 拍板 → 再開實作 ticket。不在本計畫內寫產品程式碼。

---

## 2. 首頁請求基線（量測對象）

掛載時（預設市場 + 預設分類）大致會打：

| # | Endpoint | 觸發軸 | 備註 |
|---|----------|--------|------|
| 1 | `GET /api/markets/list?type=…` | category | |
| 2 | `GET /api/prices/movers?category=…` | category | |
| 3 | `GET /api/insights/rest-days?…` | market | 路徑以 `src/lib/api.ts` 為準 |
| 4 | `GET /api/insights/weather-risk?market=…` | market | |
| 5 | `GET /api/prices/overview?market=…&category=…` | market + category | Hero 關鍵資料 |
| 6 | `GET /api/prices/overview/trend?…` | market + category | Sparkline |

**兩個正交軸：**

- **Category：** 切蔬菜／水果／肉／漁 → 1、2、5、6 重打  
- **Market：** 切市場 → 3、4、5、6 重打  

量測時至少覆蓋：

1. **冷訪問：** 無瀏覽器快取、理想上 function 也偏冷（清 cookie / 無痕 + 間隔 ≥ revalidate）  
2. **暖訪問：** 同一 session 內 30 秒內再整理  
3. **切市場一次**（同分類）  
4. **切分類一次**（可能連帶換市場清單）

---

## 3. 指標定義

### 3.1 必須收集（決策硬依賴）

| ID | 指標 | 定義 | 建議來源 |
|----|------|------|----------|
| M1 | **API p50 / p95** | 各首頁 endpoint 的 server 回應時間 | Vercel Observability / function logs |
| M2 | **Cold start 比例** | 該 route 冷啟／總調用 | Vercel function 指標 |
| M3 | **Wall-clock 就緒** | 從 navigation start 到 overview **與** movers 皆有結果（成功或明確 error） | 瀏覽器 Performance / 自訂 mark |
| M4 | **TTFB (document)** | 首頁 HTML 的 Time to First Byte | Web Vitals / CrUX / Lighthouse |
| M5 | **Cache-Control 行為** | 各 API 是否帶預期 `s-maxage`；CDN hit 跡象（`Age`、`x-vercel-cache`） | `curl -I` 或 DevTools |

### 3.2 建議收集（強化決策）

| ID | 指標 | 用途 |
|----|------|------|
| M6 | LCP / 自訂「均價數字可見」時間 | 對齊體感 |
| M7 | 首屏期間 function 調用次數 | 驗證「6 槍」假設 |
| M8 | 錯誤率（overview / movers 4xx·5xx） | 避免把失敗當慢 |
| M9 | 預設市場+蔬菜 vs 漁產/肉 的延遲差 | 評估 bootstrap cache key 複雜度 |

### 3.3 成功／行動門檻（會上可改，預填建議）

| 觀察 | 傾向決策 |
|------|----------|
| 暖訪問 wall-clock（M3）p75 **&lt; 400ms**，且 cold 不常發生 | **維持現狀（F5 不做、F6 不做）**，ADR 記「再評估條件」 |
| 暖已快、**冷** wall-clock p75 **&gt; 1.5s** 或 cold ratio 高 | 優先考慮 **F5 合併**（減少 cold 次數） |
| TTFB 很好，但 **hydrate 後空白 &gt; 1s**（M3 − M4 很大） | 優先考慮 **F6 預取** 或 F5+部分預取 |
| TTFB 已差（M4 p75 偏高） | **不要**輕易上 F6 全量 SSR 預取；先 F5 或更細 cache |
| 僅單一 endpoint（如 movers）是長尾 | **不要**上巨型 bootstrap；優化該路或只合併該子集 |

門檻數字可在決策場依產品調整；重點是**會前寫進 ADR「Decision drivers」**，避免會上憑感覺。

---

## 4. 量測手順

### 4.1 一鍵／手動 API 延遲（M1、M5）

在**正式網域**（或 production 同設定的 Preview）執行。將 `BASE` 換成實際 site URL。

```bash
# 例：BASE=https://your-deployment.vercel.app
BASE="${BASE:?set BASE to production or preview origin}"

endpoints=(
  "/api/markets/list?type=Veg"
  "/api/prices/movers?category=vegetable"
  "/api/prices/overview?market=%E5%8F%B0%E4%B8%AD&category=vegetable"
  "/api/prices/overview/trend?market=%E5%8F%B0%E4%B8%AD&days=7&category=vegetable"
  "/api/insights/weather-risk?market=%E5%8F%B0%E4%B8%AD"
)

# 每個 endpoint 連打 5 次，記錄 total time 與 cache 相關 header
for path in "${endpoints[@]}"; do
  echo "=== $path ==="
  for i in 1 2 3 4 5; do
    curl -sS -o /dev/null -D - -w "time_total=%{time_total}\n" \
      "$BASE$path" | tr -d '\r' | grep -Ei '^(HTTP/|cache-control:|age:|x-vercel-cache:|time_total=)'
    echo "---"
  done
done
```

**休市日** endpoint 的 query 以實際 `fetchMarketRestDays` 參數為準（通常含 `market`、`startDate`、`endDate`），量測時補上一筆真實 URL。

**記錄表（複製到 ADR 附錄或本檔底部 Results）：**

| Endpoint | Run1s | Run2s | … | p50估 | Cache-Control | x-vercel-cache (最後一次) |
|----------|-------|-------|---|-------|---------------|---------------------------|
| markets/list | | | | | | |
| movers | | | | | | |
| overview | | | | | | |
| trend | | | | | | |
| weather-risk | | | | | | |
| rest-days | | | | | | |

### 4.2 瀏覽器 Wall-clock（M3、M4、M6）

1. 正式站無痕視窗，DevTools → Network + Performance。  
2. 硬重新整理，記錄：  
   - Document TTFB  
   - 六支 API 的開始／結束時間  
   - **最晚完成的 API 時間 − navigation start** ≈ M3  
3. 再整理一次（暖），重複。  
4. 切一個市場、切一個分類，各記一輪「增量 wall-clock」。  
5. 若有 Web Vitals 上報，匯出首頁 LCP / TTFB 一週分位。

可選：在決策前臨時加 `performance.mark`（**量測用分支，不進 main 也可**）：

```ts
// 概念示例：overview 與 movers 都 settled 後
performance.mark('home-primary-data-ready')
performance.measure('home-primary-data', 'navigationStart', 'home-primary-data-ready')
```

### 4.3 Vercel 後台（M1、M2、M7、M8）

時間窗建議 **≥ 7 天**（若流量低可延長）：

- 篩選 path 前綴：`/api/prices/overview`、`/api/prices/movers`、`/api/markets/list`、`/api/insights/*`  
- 記錄：invocations、error rate、duration p50/p95、cold starts（若有）  
- 對照流量是否集中在首頁時段  

### 4.4 合成「合併收益」估算（不需先實作 bootstrap）

用同一輪 Network 瀑布圖估算：

```text
parallel_wall = max(各 API duration)     // 現況（理想平行）
serial_proxy  = sum(各 API duration)     // 若誤做成串列的上限
bootstrap_est = max(各 API) + overhead   // 合併進一個 function 的樂觀估計
                                         // overhead 建議先加 20–50ms
cold_penalty  = 假設每次 cold 額外 C ms  // 從 Vercel 估
```

- 若 `parallel_wall` 已接近單一最慢 API，且 cold 少 → **F5 收益有限**  
- 若常出現「多支同時 cold」→ **F5 減少 cold 次數** 可能明顯  
- 若 `document TTFB` 很小但 `parallel_wall` 大 → **F6 或 streaming 預取** 較有感  

把估算填進 ADR「Options → Expected impact」。

---

## 5. Results

> 量測完成日期：2026-07-14  
> 環境：production — https://tw-veggieprice.vercel.app/  
> 執行者：agent（curl 合成量測）  

### 摘要

| 指標 | 冷 | 暖 | 備註 |
|------|----|----|------|
| Document TTFB (M4) | ~83–104 ms | 同左 | `x-vercel-cache: STALE`，age≈122s |
| Primary data wall-clock (M3) | 估 **~10s+**（平行取 max） | 估 **&lt;100 ms** | 由 API MISS/HIT 推估，非瀏覽器 RUM |
| 最慢 API 是誰 | overview ~10.1–10.6 s MISS | HIT ~80 ms | 台北一／台中蔬菜皆然 |
| Cold start 是否常見 | 首次 MISS 成本極高 | HIT 穩定 | weather-risk/rest-days/trend 冷路徑 6–9s |

### Endpoint 明細（time_total 秒）

| Endpoint | Cold MISS | Warm HIT 約 | Cache 觀察 |
|----------|-----------|-------------|------------|
| `/` document TTFB | 0.08–0.10 | — | STALE |
| markets/list?type=Veg | （已 HIT）0.07–0.35 | ~0.08 | `public` |
| movers?category=vegetable | **0.61** | ~0.07–0.08 | `public` |
| overview 台中 vegetable | **10.64** | ~0.07–0.09 | `public` |
| overview 台北一 vegetable | **10.09** | ~0.08–0.37 | `public` |
| overview/trend 台中 | **6.40** | ~0.07 | `public` |
| weather-risk 台中 | **9.37** | ~0.07–0.08 | `public` |
| rest-days 台中 | **7.56** | ~0.18–0.27 | `public` |

### 決策場建議

- [x] 傾向 F5 + F6 分階段（順序：**先 F6，再評估 F5**）→ **ADR 選項 D，已 Accepted**  
- [ ] 傾向維持現狀  
- [ ] 傾向 F5 only  
- [ ] 傾向 F6 only（不做後續 F5 評估）  
- [ ] 數據不足，延長量測  

依據：M4 已佳；M1/M3 冷路徑 overview ~10s → 先 F6；多支 API 同時 MISS 留作 F5 再評估。

### 後續複測（F6 上 production 後）

- 再跑本節 curl 基線 + 瀏覽器 wall-clock（含切市場）。  
- 對照 ADR-0001「再評估條件」決定是否開 F5。

---

## 6. 完成定義（DoD）

基線量測 DoD（已達成，2026-07-14）：

1. M1–M5 至少有一輪正式數據寫入 §5 或 ADR 附錄。  
2. 冷／暖各至少一組 wall-clock（API 層）。  
3. Endpoint 的 Cache-Control / `x-vercel-cache` 已核對。  
4. 決策場建議已勾選。  
5. ADR-0001 已 **Accepted（D）**。

**F5 實作仍禁止**，直到 ADR 再評估條件觸發並更新 Decision。

---

## 7. 與 ADR 的銜接

| 文件 | 職責 |
|------|------|
| **本文件** | 怎麼量、量什麼、Results |
| **[ADR-0001](../adr/0001-homepage-data-fetch-topology.md)** | 選項、取捨、正式 Decision（**D Accepted**） |
| **診斷報告 F5/F6** | 問題來源與歷史脈絡 |
