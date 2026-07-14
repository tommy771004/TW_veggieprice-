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

## Loop 第 4 輪

### 驗證 `7fa0d6f` meat trend（已上線）

| 檢查 | 結果 |
|------|------|
| meat trend | ✅ 真實序列 98.5→…→103.2；volume=頭數（非 1000 假值）；有 label |
| veg/fruit/seafood/home | ✅ 與第 2–3 輪一致 |
| 部署 | Vercel `dpl_F36Juji…` READY / production |

### 本輪新發現 → ship

| 嚴重度 | 問題 | 修復 |
|--------|------|------|
| **低** | meat overview `totalVolume` 恒 0、`volumeChange` 0 | `porkTotalHeads` / `porkVolumeChange` 從當日毛豬成交頭數計算 |

### 預期部署後 meat overview

- totalVolume ≈ **16593**（頭）  
- volumeChange 相對前一交易日非 0（約 -9.5% vs 07-07）  

---

## Loop 第 3 輪

回歸 `172e35f` 穩。Ship 肉品真實 trend（`7fa0d6f`）。

---

## Loop 第 2 輪（部署後驗證）

**部署：** `172e35f` 已上線。蔬果分型、漁產日均／趨勢、SSR $70.9 皆 ✅。無 code fix。

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
