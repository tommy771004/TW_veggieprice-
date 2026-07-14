# 部署後驗證報告

**環境：** https://tw-veggieprice.vercel.app/  
**驗證時間：** 2026-07-14  

---

## 測試計畫

| ID | 項目 | 預期 |
|----|------|------|
| T1 | Homepage TTFB HIT/STALE | 大致 &lt; 500ms |
| T2 | F6 `initialOverview` 嵌 HTML | 有真實均價 |
| T3 | vegetable / fruit / meat / seafood overview | 200；錯誤路徑 404 |
| T4 | seafood + **台北一**（別名） | 200（非 404） |
| T5 | movers / markets list | 200 |
| T6 | insights（weather-risk / rest-days / forecast） | 200 |
| T7 | history / seasonal | 200 |
| T8 | `npm run test:unit` | 全過 |

---

## Loop 第 2 輪（部署後驗證）

**部署：** `172e35f` 已上線。

| 檢查 | 結果 | 備註 |
|------|------|------|
| vegetable 台北一 | ✅ | avg **70.9**（Veg-only，不再混水果） |
| fruit 台北一 | ✅ | avg **76.8**（≠ 蔬菜） |
| seafood 台北一 | ✅ | date **2026-07-08**、avg **180.1**、priceChange **+9.4** |
| seafood trend 台北／台北一 | ✅ | 近週有點 + 休市 null |
| Homepage SSR | ✅ | TTFB ~691ms，今日均價 **$70.9**（與 Veg overview 一致） |
| meat overview | ✅ | date 2026-07-08、avg 103.2、priceChange +2.2 |
| 假市場 vegetable | ✅ | HTTP 404 `{error}` |
| movers vegetable | ✅ | 200、5 筆（冷路徑 ~21s，F5 仍延後） |
| markets list seafood | ✅ | 含「台北」等 |

**本輪無新 code fix**（優先確認上輪修復落地）。文件更新後 commit。

---

## Loop 第 1 輪（2026-07-14，修復 **尚未** 上線）

| 檢查 | 結果 |
|------|------|
| Homepage TTFB | ✅ ~420ms，SSR 今日均價 $72.7 |
| vegetable overview 台北一 | ✅ 72.7 / priceChange -16.8 |
| fruit overview 台北一 | ❌ **仍 = 72.7**（與蔬菜相同） |
| seafood overview 台北一 | ❌ avg **163.7**、priceChange **0** |
| seafood trend | ❌ `[]` |

動作：`npm run test:unit` 27/27；ship `172e35f`。

---

## 已修（`172e35f`）

| 嚴重度 | 問題 | 修復 |
|--------|------|------|
| **高** | 漁產 overview **跨所有交易日平均**，非最新日；`priceChange` 恒 0 | `fetchSeafoodMarketOverview` 依日彙總 + 對前一交易日漲跌 |
| **中** | 漁產 trend 恒回 `[]` | `fetchSeafoodMarketTrend` 從 snapshot 建週走勢 |
| **中** | 蔬果 overview **未分 N04/N05**，水果=蔬菜同數字 | `fetchMarketOverviewTrend(..., marketType)` |
| **中** | 緊湊 ROC `1150708` 無法轉 ISO | `rocToISO` 支援 YYYMMDD |
| **低** | 肉品 hero 日期用雞蛋日而非毛豬日 | livestock `date` 優先 pork |
| **低** | 預設首頁 shell 混入水果 | `home-prefetch` 固定 `Veg` |

### 預期部署後 seafood（台北一）大致

- date ≈ **2026-07-08**（snapshot 最新日，非今天）  
- avgPrice ≈ **180.1**（非跨日混均 163.7）  
- priceChange ≈ **+9.4%**（相對 07-07）  
- trend：近週有點的折線  

---

## 仍延後

- **F5** 多 endpoint fan-out（ADR-0001）  
- 肉品 JSON `lastUpdated` 偏舊 — 需 data sync pipeline，非 API 邏輯  
- `Cache-Control` 回應常只見 `public`（CDN 仍 HIT）  
- 漁產 movers 極端漲跌幅 outlier  

---

## 再部署後 30 秒 smoke

```bash
BASE=https://tw-veggieprice.vercel.app
curl -sS "$BASE/api/prices/overview?market=%E5%8F%B0%E5%8C%97%E4%B8%80&category=seafood"
# 期望 date≈2026-07-08、priceChange 非 0
curl -sS "$BASE/api/prices/overview/trend?market=%E5%8F%B0%E5%8C%97&days=7&category=seafood" | head -c 200
# 期望非 []
curl -sS "$BASE/api/prices/overview?market=%E5%8F%B0%E5%8C%97%E4%B8%80&category=fruit"
curl -sS "$BASE/api/prices/overview?market=%E5%8F%B0%E5%8C%97%E4%B8%80&category=vegetable"
# 期望兩者 avgPrice 不再必然相同
```
