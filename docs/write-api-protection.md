# 寫入 API 防護與驗證

## 程式內的防護

`/api/feedback` 與 `/api/audit` 共用 `src/lib/server/writeRequest.ts`：

- 僅接受 `application/json`（可含 charset，支援現有 fetch 與 sendBeacon Blob）。
- 若有 Origin，必須與該請求的 URL origin 相同；拒絕 `Sec-Fetch-Site: cross-site`。無 Origin 的非瀏覽器 JSON 請求仍相容；此檢查不是身分認證，也無法阻止自行偽造 HTTP 的機器人。
- 逐塊計算實際 body 位元組數；不只信任 Content-Length。feedback 上限 32 KiB，audit 上限 256 KiB。超限回傳 413。
- JSON 必須是非 null、非陣列的物件。feedback 無效輸入回傳 400；audit 保留無效事件靜默略過的 204 行為。
- feedback 每分鐘最多 10 次；audit 每分鐘最多 120 次（每次仍最多處理前 50 筆事件，保留事件白名單）。超限回傳 429 與 Retry-After。
- 未設定 DB 的既有降級不變：feedback 回傳 503、audit 回傳 204；不觸發寫入。

## 限流邊界：仍需部署端防護

這是 **process-local、best-effort** 固定時間窗限流，不是跨 Vercel instance 的全域限流。冷啟動、多 instance 與時間窗交界可能讓實際請求量超過單個時間窗限制；也不是 DDoS 防護。

僅在 `VERCEL=1` 時使用 Vercel 代理覆寫的 `x-forwarded-for` 第一個有效 IP；記憶體中只保存 SHA-256 雜湊。其他環境不信任使用者可偽造的 IP header，而使用共用 bucket；不要在非 Vercel 代理環境自行設 `VERCEL=1`。同一 NAT 後的使用者可能共享額度，調整前應查看真實流量。

每個端點最多保留 10,000 個 bucket；額滿時移除已過期項目，不逐出仍有效的限制。若仍額滿，新來源暫回 429。bucket 不會寫入資料庫，process 結束即消失。

部署管理者仍需另行核准與執行：

1. 在 Vercel Firewall 為這兩個 POST 路徑設定跨 instance 的 rate-limit 規則（依方案可用性與真實流量調整）。
2. 驗證正式與 Preview 網域的同來源請求、IPv4/IPv6、NAT 流量與 Retry-After 行為。
3. 若平台限流不可用，先決定共享儲存方案與費用，再實作分散式計數；不要把現在的記憶體計數宣稱為全域保護。

本次程式修補不建立雲端資源、不變更 Firewall、不操作正式資料庫，也不執行 DB migration。

## 回歸驗證

- `writeRequest.test.ts`：正常 JSON／Blob MIME、異常 JSON、跨站、位元組與串流上限、代理信任邊界、限流與 bucket 容量。
- `writeRoutes.test.ts`：執行真正的 Route Handler 原始碼，僅替換 Next、DB、遙測等依賴；DB 與遙測完全用記憶體假物件，禁止載入實際連線模組。覆蓋成功寫入、既有降級、失敗、限流，以及 audit 的 after 排程與批次上限。

執行 `npm run lint`、`npm run test:unit`、`npm run typecheck`。這些測試不發送任何正式回饋或分析事件。
