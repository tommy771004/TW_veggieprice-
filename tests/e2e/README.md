# End-to-end 測試（Playwright）

設定檔：`playwright.config.ts`（`testDir: ./tests/e2e`、`baseURL: http://localhost:3000`）。
Projects：`chromium`（Desktop Chrome）與 `mobile-safari`（iPhone 14 / WebKit）。

目前的規格：

- `featured-recipes.spec.ts` — 首頁「今日精選食譜」區塊：渲染、分類 tab 切換、查看更多（+5）邊界、換一批重置、開/關詳情彈窗、食材連回行情搜尋。

## 首次準備

```bash
npm ci
npx playwright install chromium webkit   # 兩個 project 用到的瀏覽器
```

## 本機執行

`playwright.config.ts` **沒有設定 `webServer`**，所以要**先自己把站起起來**（另開一個終端機）：

```bash
# 終端機 A：起站（擇一）
npm run dev                 # 開發模式（hydration 較慢，測試已用 toPass 容錯）
# 或
npm run build && npm start  # 產線模式（較接近真實、hydration 較快）

# 終端機 B：跑測試
npm run test:e2e                              # 全部 project
npx playwright test --project=chromium        # 只跑桌機
npx playwright test tests/e2e/featured-recipes.spec.ts --headed   # 開瀏覽器看
```

> 靜態食譜區不依賴 MOA 行情 API，所以 MOA 不可達時這支測試仍會過（測試等的是區塊自己的 `data-testid`，不是整頁載入完成）。

## 兩個容易踩雷的點（已在 spec 內處理）

1. **首訪引導彈窗**：全新瀏覽器 context 的 `localStorage` 是空的，`OnboardingModal` 會以全屏遮罩蓋住整頁、攔截所有點擊。spec 於 `beforeEach` 用 `addInitScript` 預設 `localStorage['veggieprice_onboarding_seen'] = '1'`。新寫首頁互動測試時記得沿用。
2. **動態載入的 hydration 時間差**：食譜區在 `HomeClient` 是 `next/dynamic` 載入，SSR 標記先出現、handler 稍後才掛上，太早點擊會被丟失。spec 用 `expect(async () => { await click; await expect(...) }).toPass()` 重試點擊直到生效。

選擇器一律用 `data-testid`（`featured-recipes` / `recipe-tab-*` / `recipe-card` / `recipe-view-more` / `recipe-shuffle` / `recipe-sheet` / `recipe-sheet-close` / `recipe-ingredients` / `recipe-steps` / `recipe-ingredient-link`）。

## CI 接法（GitHub Actions 範例）

```yaml
# .github/workflows/e2e.yml
name: e2e
on: [push, pull_request]
jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium webkit
      - run: npm run build
      - run: npm start &                 # 背景起站
      - run: npx wait-on http://localhost:3000   # 或 curl --retry 輪詢
      - run: npm run test:e2e
```

### （可選）讓 `npm run test:e2e` 自動起站

若不想在 CI／本機手動起站，可在 `playwright.config.ts` 加：

```ts
webServer: {
  command: 'npm run build && npm start',
  url: 'http://localhost:3000',
  timeout: 120_000,
  reuseExistingServer: !process.env.CI,   // 本機若已有站在跑就沿用
},
```

加了之後 `npm run test:e2e` 會自行起站、跑完關掉；本機已在跑 dev server 時則沿用既有的。

## 產出物

`test-results/`、`playwright-report/` 皆為執行產物，已列入 `.gitignore`，不要 commit。
