# 聯盟／贊助版位 — 登記與設定文件

本文件說明如何設定作物詳情頁的「推薦服務」版位、如何向各聯盟/廣告平台註冊取得追蹤連結，以及如何用 `audit_log` 觀察點擊轉換（CTR）。

相關檔案：

| 用途 | 路徑 |
| --- | --- |
| 版位內容設定（你主要編輯這裡） | [src/lib/affiliates.ts](../src/lib/affiliates.ts) |
| 版位 UI 元件（通常不需改） | [src/components/affiliate/AffiliateSlot.tsx](../src/components/affiliate/AffiliateSlot.tsx) |
| 行為事件白名單 | [src/lib/auditEvents.ts](../src/lib/auditEvents.ts) |
| 隱私權與揭露頁 | [src/app/privacy/page.tsx](../src/app/privacy/page.tsx)（`/privacy#disclosure`） |
| 資料表 schema | [db/schema.sql](../db/schema.sql)（`audit_log`） |

---

## 一、版位長怎樣、出現在哪

- 出現在每個**作物詳情頁**（`/produce/[作物]`）的「產地追溯摘要」上方。
- 內容由 `AFFILIATE_OFFERS` 陣列驅動，依「作物類別／指定作物」自動挑選並以**輪播**顯示（預設最多 6 張，可自動播放、滑入/聚焦或按暫停鈕會停、尊重 reduce-motion）。
- 沒有任何符合條件且啟用的檔位時，**整個版位不會出現**（不留空白區塊）。
- 本版位所有連結皆為推廣連結，UI 一律加上 `rel="sponsored nofollow"` 並顯示揭露說明。標示「贊助」者為付費推廣，「合作推薦」者為一般聯盟連結。

---

## 二、快速開始（3 步驟）

1. 到目標平台註冊聯盟/分潤帳號，取得**帶有你專屬追蹤碼的連結**。
2. 打開 [src/lib/affiliates.ts](../src/lib/affiliates.ts)，在 `AFFILIATE_OFFERS` 新增或修改一筆檔位，把 `url` 換成你的追蹤連結，並設 `enabled: true`。
3. 部署。點擊與曝光會自動寫入 `audit_log`，用第六節的 SQL 查成效。

> ⚠️ Vercel 免費（Hobby）方案限非商業用途。一旦放聯盟/廣告連結即屬商業使用，請升級到 **Vercel Pro** 或改用允許商用的免費平台（如 Cloudflare Pages）。

---

## 三、檔位欄位完整說明（`AffiliateOffer`）

| 欄位 | 必填 | 型別 | 說明 |
| --- | --- | --- | --- |
| `id` | ✔ | string | 唯一識別碼，用於追蹤統計。**請勿重複、勿事後更名**（會中斷歷史數據）。 |
| `enabled` | ✔ | boolean | 是否啟用。`false` 時完全不顯示、不追蹤。 |
| `sponsored` | ✔ | boolean | `true`＝付費贊助（「贊助」標籤）；`false`＝一般聯盟（「合作推薦」標籤）。**兩者都會加 `rel="sponsored nofollow"`**。 |
| `title` | ✔ | string | 卡片標題，支援 `{crop}` 套版。 |
| `description` | ✔ | string | 卡片描述，支援 `{crop}`。 |
| `ctaLabel` | ✔ | string | 按鈕文字，支援 `{crop}`。 |
| `url` | ✔ | string | 你的聯盟/分潤追蹤連結。URL 內的 `{crop}` 會被自動 **URL-encode** 後代入。 |
| `icon` | — | string | [Material Symbols](https://fonts.google.com/icons) 圖示名稱，如 `local_shipping`、`agriculture`。 |
| `categories` | ✔ | array | 要顯示的作物類別：`'all'` 或 `vegetable`/`fruit`/`flower`/`mushroom`/`meat`/`seafood`。 |
| `crops` | — | array | 只針對特定作物（以「包含」比對作物名稱），命中者會**優先排序**。例：`['芒果','西瓜']`。 |
| `priority` | — | number | 排序權重，越大越前面（預設 0）。 |
| `partner` | — | string | 合作夥伴名稱，顯示於卡片並用於揭露與統計。 |

### `{crop}` 套版

`title` / `description` / `ctaLabel` / `url` 中的 `{crop}` 會被換成目前作物名稱。
文字用原字串、URL 會自動編碼。例如在芒果頁，`https://icook.tw/search/{crop}/` → `https://icook.tw/search/%E8%8A%92%E6%9E%9C/`。

### 鎖定規則與排序

- 一筆檔位會顯示的條件：`enabled` 為真，且（`categories` 命中目前類別或 `'all'`）**或**（`crops` 命中目前作物）。
- 排序：先放 `crops` 命中的檔位，再依 `priority` 由大到小，最後取前 `limit`（預設 2）筆。

---

## 四、台灣常見聯盟／廣告平台註冊指南

> 流程：在平台後台選好要推廣的「商品/活動」→ 產生**推廣連結**（含你的追蹤碼）→ 貼到檔位的 `url`。

### 1. 聯盟網 Affiliates.one
- 用途：綜合電商、生鮮、生活用品。
- 取得連結：登入 → 找到合作廠商 → 取得「推廣連結 / Deep Link」。
- 適合鎖定：`categories: ['all']` 的生鮮宅配檔位。

### 2. 通路王 iChannels
- 用途：與聯盟網類似的台灣 CPS 平台，廠商眾多。
- 取得連結：選擇活動 → 複製「轉換網址」。

### 3. momo 購物網 聯盟行銷
- 用途：生鮮、農特產直購。
- 取得連結：momo 聯盟後台產生商品推廣連結。
- 建議：`sponsored: false`、`partner: 'momo購物網'`。

### 4. Shopee 蝦皮分潤計畫（Affiliate）
- 用途：農產、廚房用品。
- 取得連結：蝦皮分潤後台 → 產生商品/賣場短連結。

### 5. KKday（農遊・採果體驗）★「旅遊」切入點，已內建
- 你的 KKday 推廣代碼（CID）：**25570**。
- 機制：在**任何** KKday 頁面網址後面加上 `?cid=25570`（若該網址已含 `?` 參數，改用 `&cid=25570`），即為你的專屬推廣連結。
- 已內建 `kkday-farm`（採果體驗，鎖定水果類，並對草莓/葡萄/火龍果/藍莓/水梨/番茄/柑橘優先顯示）：
  `https://www.kkday.com/zh-tw/product/productlist?keyword=採果&cid=25570`
- 要新增更多：在 KKday 挑特定行程頁 → 複製網址 → 接上 `?cid=25570` → 在 `AFFILIATE_OFFERS` 新增一筆。
- 提醒：避免用 `keyword={crop}` 動態搜尋——部分作物會搜到不相關結果（例如「香蕉」可能跳出香蕉船水上活動），固定用「採果」較穩。
- Klook 等其他平台同理，各自註冊取得追蹤連結後比照新增。

### 6. Google AdSense（展示廣告，機制不同）
- AdSense 是**自動投放的展示廣告**，不走本版位的「檔位」模式。
- 若要導入，需另外放入 AdSense 程式碼片段（建議獨立元件），並務必：
  - 先建立並連結本隱私權頁、補上必要的同意機制；
  - 注意對 Core Web Vitals 與版面的影響。
- 低流量時 zh-TW 單價偏低，建議流量起來後再評估。

### 7. 已內建的商家（預設啟用）
[src/lib/affiliates.ts](../src/lib/affiliates.ts) 已填入從聯盟網／通路王取得的 13 個商家連結（生鮮買菜網、水餃、滴雞精、外送、機能食、特產等），並依作物類別做了初步鎖定與排序。可直接調整各筆的 `enabled`、`categories`、`crops`、`priority` 與文案。

| 商家 | 平台 | 鎖定 |
| --- | --- | --- |
| 李大娘買菜網、七號店舖、統一生機、鮮綠生活、好歐食庫 | 生鮮電商 | 食材類作物 |
| Uber Eats、猿山鹿水餃、門前隱味 | 即食/料理 | 葉菜（水餃綁高麗菜/韭菜等） |
| 純煉滴雞精 | 保健 | 肉類（雞） |
| BASE FOOD、天下第一好茶、iCookie、byFood | 特產/機能 | 食材類作物 |

---

## 五、點擊與曝光如何被記錄

版位會自動寫入兩種行為事件到 `audit_log`（皆已列入白名單 [src/lib/auditEvents.ts](../src/lib/auditEvents.ts)）：

| `action` | 觸發時機 | `target` | `metadata` |
| --- | --- | --- | --- |
| `affiliate_impression` | 卡片**捲動進可視範圍**（每檔位每次載入最多一次） | 檔位 `id` | `{ crop?, sponsored, partner, placement }` |
| `affiliate_click` | 使用者**點擊**卡片 | 檔位 `id` | `{ crop?, sponsored, partner, placement }` |

> 曝光採 IntersectionObserver，只有真正被看到才計一次，因此 `clicks / impressions` 即為可信的 CTR。
> `placement` 標示版位來源：`detail`（作物詳情頁輪播）、`home`（首頁跑馬燈）、`search`（搜尋頁跑馬燈）；`crop` 僅詳情頁有。

---

## 六、成效查詢 SQL（在 Neon SQL Editor 執行）

**各檔位點擊、曝光與 CTR：**
```sql
SELECT
  COALESCE(c.target, i.target)                              AS offer_id,
  COALESCE(i.impressions, 0)                                AS impressions,
  COALESCE(c.clicks, 0)                                     AS clicks,
  ROUND(100.0 * COALESCE(c.clicks,0) / NULLIF(i.impressions,0), 2) AS ctr_pct
FROM
  (SELECT target, count(*) AS clicks
     FROM audit_log WHERE action = 'affiliate_click' GROUP BY target) c
FULL JOIN
  (SELECT target, count(*) AS impressions
     FROM audit_log WHERE action = 'affiliate_impression' GROUP BY target) i
  ON c.target = i.target
ORDER BY clicks DESC;
```

**哪些作物最會帶動點擊（找高轉換作物頁）：**
```sql
SELECT metadata->>'crop' AS crop, count(*) AS clicks
FROM audit_log
WHERE action = 'affiliate_click'
GROUP BY 1 ORDER BY 2 DESC LIMIT 20;
```

**依合作夥伴彙總：**
```sql
SELECT
  metadata->>'partner' AS partner,
  count(*) FILTER (WHERE action = 'affiliate_impression') AS impressions,
  count(*) FILTER (WHERE action = 'affiliate_click')      AS clicks
FROM audit_log
WHERE action IN ('affiliate_impression', 'affiliate_click')
GROUP BY 1 ORDER BY clicks DESC;
```

**近 7 天每日點擊趨勢：**
```sql
SELECT date_trunc('day', created_at) AS day, count(*) AS clicks
FROM audit_log
WHERE action = 'affiliate_click' AND created_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 1;
```

**各版位（詳情頁/首頁/搜尋）的曝光、點擊與 CTR：**
```sql
SELECT
  metadata->>'placement'                                  AS placement,
  count(*) FILTER (WHERE action = 'affiliate_impression') AS impressions,
  count(*) FILTER (WHERE action = 'affiliate_click')      AS clicks,
  ROUND(100.0 * count(*) FILTER (WHERE action = 'affiliate_click')
        / NULLIF(count(*) FILTER (WHERE action = 'affiliate_impression'), 0), 2) AS ctr_pct
FROM audit_log
WHERE action IN ('affiliate_impression', 'affiliate_click')
GROUP BY 1 ORDER BY clicks DESC;
```

---

## 七、揭露與法遵（務必遵守）

- **揭露**：依公平交易與廣告規範，付費推廣須讓使用者可辨識。本版位對 `sponsored: true` 會顯示「贊助」標籤，並在標題列連到 `/privacy#disclosure`。
- **rel 屬性**：贊助連結用 `rel="sponsored nofollow noopener noreferrer"`，一般聯盟用 `rel="noopener noreferrer"`，符合 Google 連結標註建議。
- **隱私權**：放任何聯盟/廣告前，請確認 [隱私權頁](../src/app/privacy/page.tsx) 的「聯盟行銷與廣告揭露」段落內容正確，並於首頁頁尾露出連結。
- **誠實**：請勿把一般聯盟連結誤標為非贊助以規避揭露；也勿對資料中立性造成影響。

---

## 八、上下架與停用

- **暫時下架某檔位**：把該筆 `enabled` 改為 `false`。
- **全站關閉版位**：把所有檔位 `enabled` 設為 `false`，版位即不顯示。
- **保留歷史統計**：請勿刪除/更名 `id`；停用即可，數據仍可回溯查詢。

---

## 九、成本與注意事項

- **Vercel**：放廣告/聯盟屬商業使用 → 需 Vercel Pro（或改用允許商用的平台）。
- **Neon**：曝光事件會增加寫入量；本版位已用 IntersectionObserver 僅記「看得到」的曝光以節省成本。若仍需更省，可改為只記 `affiliate_click`（將 `affiliate_impression` 從白名單移除即可）。
- **效能**：版位用既有的 `glass-card` 樣式、無額外重型相依，對 Core Web Vitals 影響極小。
