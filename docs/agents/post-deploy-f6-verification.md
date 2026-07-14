# 部署後驗證報告

**環境：** https://tw-veggieprice.vercel.app/  
**驗證時間：** 2026-07-14  
**Loop 狀態：** ✅ **5/5 完成**（`.grok-loop-round` = `done`）

---

## Loop 完成摘要（5 輪）

| 輪 | Commit | 重點 |
|----|--------|------|
| 1 | `172e35f` | 漁產日均+trend、蔬果 N04/N05、`rocToISO` 緊湊日、prefetch Veg |
| 2 | `e855502` | 正式站驗證上列全 ✅（docs only） |
| 3 | `7fa0d6f` | 肉品 trend 去掉合成假線 → 毛豬頭數加權真實序列 |
| 4 | `e357e5d` | 肉品 overview `totalVolume`/量能漲跌 |
| 5 | （本輪） | 最終回歸全綠；**無新 code** |

### 第 5 輪正式站 smoke（最終）

| 檢查 | 結果 |
|------|------|
| vegetable 台北一 | ✅ avg **70.9** |
| fruit 台北一 | ✅ avg **76.8**（≠ 蔬菜） |
| seafood 台北一 | ✅ date **2026-07-08**、avg **180.1**、priceChange **+9.4** |
| seafood trend | ✅ 近週有點 |
| meat overview | ✅ avg **103.2**、totalVolume **16593**、volumeChange **-9.5** |
| meat trend | ✅ 真實 98.5…103.2（非 volume=1000 假線） |
| Homepage SSR | ✅ 今日均價 **$70.9**，TTFB ~0.6s |
| F5 | 仍延後（ADR-0001） |

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

## 各輪紀要

### 第 4 輪

驗證 meat trend `7fa0d6f` ✅。Ship `e357e5d` meat overview 頭數。

### 第 3 輪

回歸穩。Ship 肉品真實 trend。

### 第 2 輪

`172e35f` 上線驗證：蔬果分型、漁產日均／趨勢、SSR $70.9 ✅。

### 第 1 輪

修復前 prod：fruit=veg、seafood 跨日混均、trend `[]`。Ship `172e35f`。

---

## 已修清單（loop 期間）

| 嚴重度 | 問題 | 修復 / commit |
|--------|------|----------------|
| **高** | 漁產 overview 跨日混均、`priceChange` 0 | `fetchSeafoodMarketOverview` / `172e35f` |
| **中** | 漁產 trend `[]` | `fetchSeafoodMarketTrend` / `172e35f` |
| **中** | 蔬果未分 N04/N05 | `marketType` / `172e35f` |
| **中** | 緊湊 ROC `1150708` | `rocToISO` / `172e35f` |
| **中** | 肉品 trend 合成假線 | `fetchLivestockPorkTrend` / `7fa0d6f` |
| **低** | 肉品日期 / prefetch 混水果 | `172e35f` |
| **低** | meat overview volume 0 | `e357e5d` |

### 仍延後

- **F5** 多 endpoint fan-out（ADR-0001）  
- 漁產／肉品 snapshot 最新日偏舊（data sync pipeline）  
- 漁產 movers 極端漲跌幅 outlier  
- weather-risk 仍有 seed fallback（非本 loop 範圍）  

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
