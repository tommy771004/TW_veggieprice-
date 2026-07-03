# 農時價 VeggiePrice TW — 效能優化診斷報告

> **診斷範圍**: TTFB 優化、Bundle 分析與 Code Splitting、E2E 測試建置  
> **架構**: Next.js 15 App Router · React 19 · Vercel 部署  

---

## 一、TTFB 優化 — HTML 回應時間分析

### 根本問題診斷

目前首頁 (`/`) 的渲染路徑如下：

```
用戶請求 → Vercel Cold Start → Next.js 渲染 page.tsx
         → 回傳空殼 HTML (HomeClient = 全 Client Component)
         → 瀏覽器下載 JS (~300KB+)
         → React Hydrate
         → 6 個 useEffect 觸發 API 呼叫
         → 資料回填畫面
```

**實際可見資料出現時間 = TTFB + JS Parse + Hydrate + API 回應** ≈ 3-6 秒

瓶頸集中在三個位置：

| 問題點 | 現況 | 影響 |
|--------|------|------|
| `page.tsx` 未設 `revalidate` | 每次 Cold Request 都重新執行 | CDN 無法快取頁面 HTML |
| HomeClient 無初始資料 | 一律顯示骨架屏等 API | 首屏白屏時間延長 |
| API Routes `maxDuration=60` | MOA API 逾時上限寬鬆 | 冷啟動時回應可達 10s+ |

### 修正方案 A：ISR + 伺服器端預取 (最高優先)

**核心思路**：在 `page.tsx`（Server Component）預取關鍵首屏資料，  
以 ISR（`revalidate=60`）讓 Vercel CDN 快取整頁 HTML，  
同時把資料作為 props 傳入 HomeClient，第一次 render 就有內容。

完整實作見 `src/app/page.tsx`（附於報告後）。

**HomeClient 對應修改**：

在 `HomeClient.tsx` 最上方加入以下 interface，  
並修改 function 簽名與 useState 初始值：

```tsx
// 1. 在 import 區塊後加入
interface HomeClientProps {
  initialTrend?:     PriceHistoryPoint[]
  initialLivestock?: LivestockPrices | null
  initialOverview?:  MarketOverview | null
}

// 2. 修改 function 簽名
export function HomeClient({
  initialTrend     = [],
  initialLivestock = null,
  initialOverview  = null,
}: HomeClientProps) {

// 3. 修改對應 useState（約在第 60-80 行）
//  原:  const [marketTrend, setMarketTrend] = useState<PriceHistoryPoint[]>([])
//  改:  const [marketTrend, setMarketTrend] = useState<PriceHistoryPoint[]>(initialTrend)

//  原:  const [livestock, setLivestock] = useState<LivestockPrices | null>(null)
//       const [loadingLivestock, setLoadingLivestock] = useState(true)
//  改:  const [livestock, setLivestock] = useState<LivestockPrices | null>(initialLivestock)
//       const [loadingLivestock, setLoadingLivestock] = useState(!initialLivestock)

//  原:  const [overview, setOverview] = useState<MarketOverview | null>(null)
//       const [loadingOverview, setLoadingOverview] = useState(true)
//  改:  const [overview, setOverview] = useState<MarketOverview | null>(initialOverview)
//       const [loadingOverview, setLoadingOverview] = useState(!initialOverview)
```

**效果**：
- 有快取時 TTFB < 50ms（CDN 命中）
- 首屏資料無需等待 API，直接 hydrate 已有內容
- client-side useEffect 仍在背景更新最新資料（不影響體驗）

### 修正方案 B：加速個別 API Route 快取標頭

目前各路由快取設定有不一致的問題，建議統一如下：

| Route | 建議 Cache-Control |
|-------|--------------------|
| `/api/prices/overview` | `s-maxage=120, stale-while-revalidate=300` ✅ 已有 |
| `/api/prices/overview/trend` | `s-maxage=120, stale-while-revalidate=300` ✅ 已有 |
| `/api/prices/movers` | `s-maxage=120, stale-while-revalidate=300`（改為動態）|
| `/api/insights/weather-risk` | `s-maxage=900, stale-while-revalidate=3600` ✅ 已有 |
| `/api/meta/options` | `s-maxage=60, stale-while-revalidate=600`（縮短首次 TTL）|

`/api/meta/options` 目前 `s-maxage=10` 偏短，市場選單資料一天幾乎不變，  
建議改為 `s-maxage=300, stale-while-revalidate=3600`。

在 `src/app/api/meta/options/route.ts` 中：
```typescript
// 原:
'Cache-Control': 'public, max-age=10, s-maxage=60, stale-while-revalidate=600',
// 改:
'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
```

### 修正方案 C：Seasonal 頁面 ISR 補強

`/seasonal` 已有 `export const revalidate = 3600`，但 `/search` 和 `/watchlist`  
是純 Client 頁面，沒有任何快取。可對 `/search` page.tsx 加入：

```typescript
// src/app/search/page.tsx
export const revalidate = 300  // 頁面殼每 5 分鐘快取一次（資料由 client 動態取）
```

---

## 二、Bundle 分析與 Code Splitting

### 現況資源概估

執行正式 Bundle 分析需加入 `@next/bundle-analyzer`：

```bash
npm install --save-dev @next/bundle-analyzer
```

修改 `next.config.ts`：
```typescript
import bundleAnalyzer from '@next/bundle-analyzer'
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })
export default withBundleAnalyzer(nextConfig)
```

執行：`ANALYZE=true npm run build`

根據程式碼靜態分析，主要套件估算：

| 套件 | 估算 gzip 大小 | 目前用法 | 風險 |
|------|---------------|----------|------|
| `recharts` | ~180 KB | PriceLineChart、VolumeBarChart | 若被打包進首頁則嚴重 |
| `framer-motion` | ~90 KB | HomeClient（LazyMotion ✅）| 已優化，風險低 |
| `next` / React | ~45 KB | 框架本身 | 不可避免 |

### 問題 1：recharts 是否混入首頁 Bundle？

`HomeClient.tsx` 本身沒有直接 import recharts，但：

```
HomeClient.tsx
  └─ import ExploreSection  ← 有 framer-motion
  └─ import AboutSection    ← 有 framer-motion + useState
  └─ import RecommendedLinks ← 有 framer-motion
```

`recharts` 理論上只在 `/produce/[id]` 路由的 `ProduceClient.tsx` 被使用，  
Next.js App Router 會自動按頁面 code-split，**但必須透過 Bundle Analyzer 確認**。

### 問題 2：HomeClient 首頁 bundle 過大

`HomeClient.tsx` 約 900 行，引入了多個僅在頁面底部才用到的元件。  
建議對 below-the-fold 元件使用 `next/dynamic` 延遲載入：

```tsx
// src/components/pages/HomeClient.tsx 頂部修改
import dynamic from 'next/dynamic'

// 移除原有的靜態 import
// import { ExploreSection } from '@/components/ui/ExploreSection'
// import { AboutSection } from '@/components/ui/AboutSection'
// import { RecommendedLinks } from '@/components/ui/RecommendedLinks'
// import { DataSourceBadge } from '@/components/ui/DataSourceBadge'

// 改為動態 import（用戶滾動到時才載入 JS）
const ExploreSection = dynamic(
  () => import('@/components/ui/ExploreSection').then(m => ({ default: m.ExploreSection })),
  { loading: () => null }
)
const AboutSection = dynamic(
  () => import('@/components/ui/AboutSection').then(m => ({ default: m.AboutSection })),
  { loading: () => null }
)
const RecommendedLinks = dynamic(
  () => import('@/components/ui/RecommendedLinks').then(m => ({ default: m.RecommendedLinks })),
  { loading: () => null }
)
const DataSourceBadge = dynamic(
  () => import('@/components/ui/DataSourceBadge').then(m => ({ default: m.DataSourceBadge })),
  { loading: () => null }
)
```

預估可從首頁初始 JS 減少約 **25-40 KB**（framer-motion 動畫 + AboutSection accordion 邏輯）。

### 問題 3：ProduceClient 內的圖表應延遲載入

`PriceLineChart` 和 `VolumeBarChart` 在頁面滾動後才可見，  
且 recharts 很大。在 `ProduceClient.tsx` 中改為：

```tsx
// src/components/pages/ProduceClient.tsx 頂部
import dynamic from 'next/dynamic'
import { SkeletonCard } from '@/components/ui/SkeletonCard'

// 移除:
// import { PriceLineChart } from '@/components/charts/PriceLineChart'
// import { VolumeBarChart } from '@/components/charts/VolumeBarChart'

// 改為:
const PriceLineChart = dynamic(
  () => import('@/components/charts/PriceLineChart').then(m => ({ default: m.PriceLineChart })),
  {
    loading: () => <div className="skeleton h-56 rounded-xl" />,
    ssr: false,
  }
)
const VolumeBarChart = dynamic(
  () => import('@/components/charts/VolumeBarChart').then(m => ({ default: m.VolumeBarChart })),
  {
    loading: () => <div className="skeleton h-36 rounded-xl" />,
    ssr: false,
  }
)
```

此改動讓 recharts（~180 KB）只在用戶進入作物詳情頁後才下載，  
且以 `ssr: false` 確保圖表不在 SSR 階段執行（避免 hydration mismatch）。

### 問題 4：`framer-motion` 的 `m` 元件已優化，但可進一步精簡

目前 `HomeClient.tsx` 使用了 `LazyMotion + domAnimation`，這是正確做法。  
確認 `AnimatePresence` 也從 `framer-motion` 直接 import 而非別的路徑。  
若有多個元件各自 import `motion`（非 `m`），需統一改用 `m`。

搜尋專案中可能有問題的 import：
```bash
grep -r "from 'framer-motion'" src/ | grep "motion," | grep -v "LazyMotion\|m,"
```

---

## 三、E2E 測試建置

### 工具選擇：Playwright

理由：
- 原生支援 Next.js / Vercel 環境
- 支援 TypeScript + 自動等待機制（不需手動 `sleep`）
- 可模擬行動裝置（PWA 場景）
- CI/CD 整合容易

### 安裝與設定

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

修改 `package.json`：
```json
{
  "scripts": {
    "test:e2e":    "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:ci": "playwright test --reporter=github"
  }
}
```

完整設定與測試檔案見附件：
- `playwright.config.ts`
- `tests/e2e/search.spec.ts`
- `tests/e2e/watchlist.spec.ts`
- `tests/e2e/navigation.spec.ts`

### 核心測試場景設計

#### 搜尋功能（search.spec.ts）

| 測試案例 | 驗證重點 |
|----------|----------|
| 初始載入 | 頁面回應 200、結果列表可見 |
| 搜尋高麗菜 | 輸入後 results 更新、cropName 包含關鍵字 |
| 市場篩選 | 切換市場後結果改變 |
| 日期範圍篩選 | 切換近一週、近一月 |
| 價格區間篩選 | 20-50 元 preset，驗證均價在範圍內 |
| 排序功能 | 切換「價格↑」，驗證第一筆 ≤ 最後筆 |
| 自動補全 | 輸入「番」，下拉選單出現 |
| 點擊進詳情 | 點 ProduceRow 跳轉 /produce/[id] |

#### 關注清單功能（watchlist.spec.ts）

| 測試案例 | 驗證重點 |
|----------|----------|
| 空清單狀態 | 顯示「尚無收藏項目」和兩個 CTA 按鈕 |
| 加入關注 | 在作物詳情頁點愛心，按鈕變成「已加入關注」 |
| 清單顯示 | 前往 /watchlist，卡片出現、cropName 正確 |
| 移除關注 | 點移除按鈕，卡片消失 |
| 移除後空狀態 | 回到空清單 UI |
| localStorage 持久化 | 重新整理後清單仍存在 |

#### 基礎導航（navigation.spec.ts）

| 測試案例 | 驗證重點 |
|----------|----------|
| 首頁 Hero 載入 | 均價數字可見（非 `--`）|
| 底部導航切換 | 5 個頁籤正確跳轉 |
| TopAppBar 搜尋 | 輸入關鍵字跳轉 /search?q=... |
| 行動裝置視窗 | 375px 寬度下底部導航可見 |


---

## 四、優先執行順序

| 優先級 | 項目 | 預估效益 | 工時 |
|--------|------|----------|------|
| P0 | `page.tsx` 加 `revalidate=60` | TTFB 降至 < 50ms（CDN 命中）| 5 min |
| P0 | HomeClient 接受 `initialData` props | 首屏資料即時顯示 | 30 min |
| P1 | ProduceClient 動態 import 圖表 | recharts 延遲載入，首屏 -180 KB | 15 min |
| P1 | HomeClient 動態 import 底部元件 | 首頁 JS -30 KB | 20 min |
| P2 | `/api/meta/options` 快取標頭修正 | 市場選單 API 減少 95% 請求 | 5 min |
| P2 | Playwright 基礎 E2E 套件建置 | 核心功能迴歸防護 | 2 hrs |
| P3 | Bundle Analyzer 整合 + 量測基準 | 後續優化有數據依據 | 30 min |