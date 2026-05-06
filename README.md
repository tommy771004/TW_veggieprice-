# 農時價 VeggiePrice TW

以 Next.js 15 App Router 製作的台灣蔬果批發行情查詢站，提供首頁總覽、搜尋篩選、作物詳情、關注清單與 PWA 基礎能力，部署目標為 Vercel。

## 目前部署架構

- 前端頁面與 API 都由 Next.js 提供。
- Vercel 會直接執行 `src/app` 頁面與 `src/app/api/prices/*` Route Handlers。
- `src/lib/server/moa.ts` 是共用資料層，負責向農業部開放資料 API 取數、逾時控制、資料正規化與錯誤回傳。

## 重要目錄

- `src/app`: App Router 頁面、metadata、Route Handlers
- `src/components`: UI、頁面組件與圖表
- `src/lib/server`: Vercel/Next server-side 資料存取與日期工具
- `src/lib/preferences.ts`: 使用者偏好持久化與主題/字級套用
- `public`: manifest 與靜態資源
- `docs/architecture`: 部署與架構說明

## 本機開發

1. 安裝依賴

```bash
npm install
```

2. 複製環境變數

```bash
cp .env.example .env.local
```

3. 啟動 Next 開發環境

```bash
npm run dev
```

## Vercel 部署

1. 在 Vercel 匯入此 repository。
2. Build Command 使用預設的 `next build`。
3. 設定 `NEXT_PUBLIC_SITE_URL` 為正式網址或自訂網域。
4. 如需調整遠端 API 逾時，可設定 `MOA_FETCH_TIMEOUT_MS`。
5. `.vercelignore` 已排除設計稿與輔助文件，Vercel 只會上傳正式需要的程式與靜態資產。
6. 部署完成後確認 `/api/prices/overview`、`/api/prices/history`、`/manifest.json` 與 sitemap/robots 都能正常回應。

## PWA 與快取

- `public/manifest.json` 提供安裝資訊與捷徑。
- `public/sw.js` 會快取核心頁面與品牌資產，並對同網域 API 採 network-first 策略。
- `src/components/pwa/ServiceWorkerRegistrar.tsx` 會在瀏覽器端自動註冊 service worker。

若未設定 `NEXT_PUBLIC_SITE_URL`，專案會自動回退到 Vercel 提供的 `VERCEL_PROJECT_PRODUCTION_URL` 或 `VERCEL_URL`。

## 文件

- `docs/architecture/vercel-architecture.md`: Vercel 版部署拓樸、資料流、錯誤處理策略
- `.env.example`: 最小部署環境變數範本