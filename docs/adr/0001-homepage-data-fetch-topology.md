# ADR-0001：首頁資料取得拓樸（F5 + F6 同一決策）

| 欄位 | 內容 |
|------|------|
| **狀態** | **Accepted**（選項 D；F6 階段已實作，F5 待再評估） |
| **日期** | 2026-07-14 |
| **決策者** | 產品／工程（明確選擇 D） |
| **量測環境** | https://tw-veggieprice.vercel.app/ |
| **相關** | 診斷 F5／F6；[量測計畫](../agents/f5-f6-measurement-plan.md)；[效能診斷](../agents/performance-diagnosis-homepage-loading.md) |
| **實作** | F6 phase：`page.tsx` + `home-prefetch.ts` 已落地；**F5 仍禁止實作**直到再評估 |

---

## 1. Context

### 1.1 現況

- 首頁 `src/app/page.tsx` **刻意不做** SSR 資料預取，註解目標是 **fast TTFB**；`HomeClient` 以 client `useEffect` 自取資料（**F6 現況**）。
- 掛載時約 **5–6** 條獨立 Route Handler 呼叫，分屬 4 個 `useEffect`（**F5 現況**）。
- F1–F4 與 O1/O2 已處理：函式層快取、CDN 標頭、錯誤不再用假資料掩蓋。  
  → 剩餘痛點若存在，較可能來自 **請求扇出（F5）** 或 **paint 前無資料（F6）**，而非單次 JSON.parse。

### 1.2 為何 F5 與 F6 必須同一決策場

```text
F6 = 誰在「第一次 paint 前」負責拿資料？（Server 預取 vs 純 Client）
F5 = Client（或 Server）拿資料時「打幾槍」？（細粒度多 endpoint vs 合併）
```

| 若只做… | 風險 |
|---------|------|
| 只做 F5 合併 | 仍 hydrate 後才有資料；skeleton 時間可能幾乎不變 |
| 只做 F6 預取 | 預設市場有資料，但切市場又變回 5–6 槍；且可能拉高 TTFB |
| 兩者各做各的 | 重複抓取、cache 語意衝突、Loading bar 語意混亂 |

**流程硬性約定：**

```text
量測（f5-f6-measurement-plan）→ 本 ADR Decision → 再開實作 ticket / PR
```

---

## 2. Decision drivers（決策驅動）

會前用 [量測計畫](../agents/f5-f6-measurement-plan.md) 填入實際數字；門檻可改，但**不可空白進決策場**。

| Driver | 問題 | 量測 ID |
|--------|------|---------|
| D1 體感就緒 | 用戶多久看到可信均價／波動榜？ | M3、M6 |
| D2 TTFB | HTML 是否仍要極致快？ | M4 |
| D3 Cold start | 多 function 同時冷啟是否常見？ | M2、M7 |
| D4 Cache 粒度 | 合併後是否犧牲 s-maxage／命中率？ | M1、M5 |
| D5 增量互動 | 切市場／分類是否可接受整包重打？ | 切換 wall-clock |
| D6 複雜度 | 是否願意改 `CLAUDE.md` Route 表與前端載入模型？ | 工程評估 |
| D7 正確性 | Partial error（O1/O2 模式）是否保持？ | 產品 |

### 2.1 Evidence（量測後貼上）

> 狀態：**已量測**  
> 日期／環境：2026-07-14 · https://tw-veggieprice.vercel.app/  
> 方法：`curl` 各 endpoint ×5 + homepage ×3（見量測計畫 Results）

| 指標 | 冷 (MISS) | 暖 (HIT) | 來源 |
|------|-----------|----------|------|
| Document TTFB (M4) | ~83–104 ms（`x-vercel-cache: STALE`） | 同左量級 | curl homepage |
| API 單支 wall（M1） | overview **~10.1–10.6 s**；trend ~6.4 s；weather-risk ~9.4 s；rest-days ~7.6 s；movers ~0.61 s | 多數 **~70–90 ms** | curl |
| Primary data wall-clock (M3) 估算 | 平行下 ≈ **max(overview, movers, …) ≈ 10s+** | 暖 ≈ **&lt;100 ms** 量級 | 由 M1 推估 |
| 最慢 API | `/api/prices/overview`（台中／台北一蔬菜皆 ~10s MISS） | — | curl |
| Cold 是否常見 | 首次打到未快取路徑成本極高；HIT 後秒回 | CDN HIT 有效 | curl `x-vercel-cache` |
| 備註 | HTML TTFB **已很好**；痛點是 **hydrate 後等 API**（M3−M4 大） | 支援先做 F6，F5 視上線後切換路徑再評 | |

---

## 3. Options（同一決策空間）

### 選項 0 — 維持現狀（F5 不做、F6 不做）

- **做法：** 文件化現況取捨；訂「再評估條件」（例如 M3 暖 p75 &gt; 400ms）。  
- **優：** 零風險；Route 邊界清楚；TTFB 策略不變。  
- **缺：** 結構性多請求／冷啟風險仍在。  
- **預期影響：** 無實作成本；體感不變。

### 選項 A — F5 only：單一端點 bootstrap

- **做法：** `GET /api/prices/home-bootstrap?market&category` 一次回 markets、movers、overview、trend、restDays、weatherRisk；**partial success**（各欄可獨立 error）。  
- **優：** HTTP 與 cold 上限 → 1。  
- **缺：** 最慢子任務拖整包；cache key 粗；切一軸可能多拉資料。  
- **F6：** 維持 client-only。  
- **工作量：** L  

### 選項 B — F5 only：雙端點（對齊兩軸）

| 端點 | 內容 | 重打 |
|------|------|------|
| `home-shell` | markets + movers | category |
| `home-market` | overview + trend + rest + weather | market（+ category 若 overview 依分類） |

- **優：** 比巨型 bootstrap 更貼使用方式；請求 6→2。  
- **缺：** 仍最多 2 cold；文件多一組 route。  
- **F6：** 維持 client-only。  
- **工作量：** M–L  

### 選項 C — F6 only：SSR／ISR 預取預設首屏

- **做法：** `page.tsx` 預取預設 market+category 的關鍵資料（至少 overview；可選 movers），props 進 `HomeClient`；`revalidate` 對齊現有 ISR 思路。  
- **優：** 首次 paint 可能已有數字；減少 skeleton。  
- **缺：** 可能拉高 TTFB；個人化偏好市場難；與現註解「fast TTFB」衝突需明示。  
- **F5：** 切市場／分類仍用現有多 endpoint（或另開 follow-up）。  
- **工作量：** M  

### 選項 D — 分階段：F6 預設預取 → 再評估 F5

- **做法：** 先 C，上線後再量 M3；若切換路徑仍痛再上 B 或 A。  
- **優：** 先打「空白首屏」；合併可選做。  
- **缺：** 兩次架構變動；中間狀態要文件清楚。  

### 選項 E — 分階段：F5 雙端點 → 不碰 F6

- **做法：** 先 B，明確保留 fast TTFB。  
- **優：** 不犧牲 document TTFB；降低 fan-out。  
- **缺：** 首 vis 仍等 client fetch。  

### 選項 F — 同時 F5+F6（最大改動）

- **做法：** SSR 預取 + client 用 bootstrap／雙端點做後續互動。  
- **優：** 理論上最佳體感。  
- **缺：** 最高回歸風險；cache／重複請求要仔細設計。  
- **工作量：** L+  
- **建議：** 僅在 Evidence 顯示冷+暖+TTFB **同時**不達標時考慮。

### 明確不納入本 ADR 的「假選項」

- **只合併 client `useEffect`、仍打 6 支 API：** 不解決 F5 cold／function 次數，可當 cleanup 但**不當作 F5 解法**。  
- **恢復假資料撐版面：** 與 O1/O2 已決策衝突，禁止。

---

## 4. Decision

| 欄位 | 內容 |
|------|------|
| **選擇** | **D** — 分階段：先 F6 預設預取 → 再評估 F5 |
| **日期** | 2026-07-14 |
| **理由（對應 Drivers）** | **D2** TTFB 已佳（~100ms STALE），不應為巨型 bootstrap 先動刀。**D1** 冷路徑 overview ~10s，首屏空白主因是 paint 後才取數 → F6 直接把預設 shell 嵌進 RSC。**D3** 多 function 同時 MISS 仍可能痛，但先讓預設市場在 HTML 重生時一次取完 overview/trend；**F5 延後**，上線後重測切市場 wall-clock 再決定 B/A。 |
| **明確不做的事（本階段）** | 不上 `/home-bootstrap` 或雙端點（F5）；不改動其他頁 API；不恢復假資料；不為個人化偏好市場做 SSR（仍 client）。 |
| **F6 範圍（本階段實作）** | `prefetchDefaultHomeData()`：`DEFAULT_MARKET`（台北一）+ 蔬菜；產出 `initialOverview` + `initialTrend`；失敗則 null/[] 由 client 重試。預設殼跳過第一次 client overview/trend round-trip。 |
| **F5** | **延後**。再評估觸發見下。 |
| **再評估條件（F5）** | F6 上 production 後：**(1)** 切市場／分類的 client wall-clock p75 仍 &gt; 1.5s，或 **(2)** 同時多支 API cold 仍常見；則重開選項 B（雙端點）優先於 A。90 天內無觸發則維持現多 endpoint。 |
| **成功指標（F6）** | 預設首訪：HTML 內嵌可信均價（非 skeleton）；ISR HIT/STALE 下 document TTFB 仍大致 &lt; 200ms；prefetch 失敗不白屏（client fallback）。 |

### 4.1 決策場檢查清單

- [x] 量測計畫 DoD 完成（M1–M5 有數）  
- [x] Evidence 表已貼  
- [x] F5 與 F6 都有明確「做／不做／延後」  
- [x] Partial error 策略已寫（prefetch 失敗 → null，client 既有 error UI）  
- [x] 不改 Route Handler 表（F6 不新增對外 API）  
- [x] 成功指標已寫  
- [x] 本 ADR 狀態改為 **Accepted**

---

## 5. Consequences

### 5.1 若 Accepted 且含實作

| 類型 | 後果 |
|------|------|
| 正 | 首屏就緒時間或 cold 次數可預期改善；取捨有文件可查 |
| 負 | Route 表／前端 loading 模型變更；E2E（loading bar、cache headers）要跟 |
| 中立 | 舊細粒度 endpoint 仍可供其他頁使用，除非另決定 deprecate |

### 5.2 實作約束（無論選 A–F）

1. 業務邏輯優先落在 `src/lib/server/moa.ts`，Route Handler 只組裝。  
2. 錯誤回 `{ error }` + 適當 HTTP status；**禁止**虛構均價。  
3. 不 reintroduce Express rewrite；維持單一 Next.js 部署。  
4. `HomeLoadingBar` 的 `active` 語意要與新的 loading 邊界一致。  
5. 先合 PR 計畫（建議）：契約／route → `HomeClient` → 文件與 E2E。

### 5.3 若選 0 或 Deferred

- 本 ADR 仍保留，狀態改 **Accepted（維持現狀）** 或 **Deferred**。  
- 診斷報告 F5／F6 標記「已決策：不實作，見 ADR-0001」。  
- 到達「再評估條件」前不開實作 ticket。

---

## 6. PR / Ticket 草案（僅在 Accepted 且非選項 0 時啟用）

| 順序 | 內容 | 依賴 |
|------|------|------|
| T0 | 關閉量測、更新本 ADR Decision | — |
| T1 | 新 route(s) + 型別 + 契約測試 | T0 |
| T2 | `HomeClient` 改接线；保留舊 API | T1 |
| T3 | Cache headers、CLAUDE.md Route 表、E2E | T2 |
| T4 | （若含 F6）`page.tsx` 預取 + props | 可與 T1 平行，需合併策略 |

---

## 7. References

- [F5/F6 量測計畫](../agents/f5-f6-measurement-plan.md)  
- [首頁初始化載入效能診斷](../agents/performance-diagnosis-homepage-loading.md)  
- `src/components/pages/HomeClient.tsx`（多 `useEffect` 取數）  
- `src/app/page.tsx`（fast TTFB、無預取）  
- `Claude.md` / 專案 Vercel 拓樸（Route Handler 對照表）  

---

## 8. Changelog

| 日期 | 變更 |
|------|------|
| 2026-07-14 | 初版 Proposed：F5+F6 綁定同一決策；實作閘門 = 量測 + Decision |
| 2026-07-14 | 對 https://tw-veggieprice.vercel.app/ 完成 curl 基線；**Accepted 選項 D**；落地 F6：`src/lib/server/home-prefetch.ts` + `page.tsx` async prefetch + HomeClient 略過預設殼第一次 round-trip |
| 2026-07-14 | Production 驗證：F6 生效（SSR 均價 $72.7，TTFB HIT ~75ms）。修復分類切換市場別名／race（`markets.ts` + HomeClient gate + seafood overview fuzzy）。F5 仍延後。 |
