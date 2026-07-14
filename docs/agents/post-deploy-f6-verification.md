# F6 部署後驗證報告（自動）

**環境：** https://tw-veggieprice.vercel.app/  
**日期：** 2026-07-14  
**部署：** ADR-0001 選項 D（F6 SSR 預取）已上線  

---

## 測試計畫

| # | 檢查項 | 方法 | 通過標準 |
|---|--------|------|----------|
| T1 | Document TTFB | curl `/` | HIT/STALE 大致 &lt; 300ms |
| T2 | F6 嵌資料 | HTML 含 `initialOverview` + 可見均價 | 預設台北一有真實數字 |
| T3 | overview API 預設市場 | curl vegetable 台北一 | 200 + 與 SSR 一致 |
| T4 | 暖 cache | 連續 curl API | 第二次明顯變快 |
| T5 | 分類市場相容 | seafood + 台北一 | 不應長期 404（需別名或先換市場） |
| T6 | 錯誤路徑 | 假市場 vegetable | 404 + `{error}` 無假資料 |
| T7 | movers / markets | curl | 200 |
| T8 | 單元 | `npm run test:unit` | pass |

---

## 結果（部署當下）

| # | 結果 | 摘要 |
|---|------|------|
| T1 | ✅ | STALE ttfb ~300ms；HIT ~74–78ms |
| T2 | ✅ | `initialOverview.avgPrice=72.7`，SSR HTML 有「台北一 今日均價 $72.7」 |
| T3 | ✅ | overview 台北一 vegetable 200，與 SSR 一致 |
| T4 | ✅ | overview/trend/movers HIT ~70–90ms；冷 MISS 仍可到數秒～10s |
| T5 | ❌→修 | **prod 仍：** `category=seafood&market=台北一` → **404**（漁產市場名為「台北」） |
| T6 | ✅ | 假市場 404 `查無市場趨勢資料` |
| T7 | ✅ | movers / markets list 200 |
| T8 | ✅ | `markets` 單元 8/8；既有 cwa 測試仍可用 |

### 額外觀察

- 首包 PRERENDER 後 HTML ~119KB，內嵌一週 trend（含休市 null 點）— 符合 F6。  
- 冷路徑 API 仍貴（overview ~10s MISS）— **F5 仍延後**，見 ADR 再評估條件。  
- 回應上 `Cache-Control` 常只見 `public`（Vercel 側仍有 `age` + HIT）；next.config 已再對齊 overview TTL，待下版部署觀察。  
- 漁產 movers 偶有極端漲跌幅（資料面 outlier），非本次範圍。

---

## 已修復（本輪，待再部署）

1. **`src/lib/markets.ts`** — `marketsMatch` / `resolveMarketInList`（台北一↔台北、台中市↔台中…）  
2. **`HomeClient`** — 等該分類市場清單就緒才打 overview；AbortController 取消過期請求  
3. **`overview` seafood** — 過濾時用 `marketsMatch`，即使仍帶「台北一」也能對到「台北」  
4. **`markets.test.ts` + `package.json` test:unit**  
5. **`next.config.ts`** — overview 預設 s-maxage=120，避免被 catch-all 60s 誤傷  

---

## 再部署後建議 smoke（30 秒）

```bash
BASE=https://tw-veggieprice.vercel.app
# 應為 200（別名修好後）
curl -sS -o /dev/null -w "%{http_code}\n" \
  "$BASE/api/prices/overview?market=%E5%8F%B0%E5%8C%97%E4%B8%80&category=seafood"
# SSR 仍應有 72.x 或當日均價
curl -sS "$BASE/" | rg -o '今日均價 \$<!-- -->[0-9.]+' | head -1
```
