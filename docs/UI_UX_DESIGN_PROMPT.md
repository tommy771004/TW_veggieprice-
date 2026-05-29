# 台灣農產品批發市場 (VeggiePrice TW) - Apple HIG UI/UX 設計規範

**Role:** Senior Apple UI Designer
**Project:** VeggiePrice TW (農產品與民生物資批發行情追蹤 App / PWA)
**Platform Context:** iOS Safari PWA / macOS Desktop (Responsive Web App)

---

## 1. 核心定義 (Core Definition)

### 📌 目標受眾 (Persona)
- **餐廳老闆/採購 (Tony, 35歲)**：需要快速掌握每日蔬菜、肉品批發價趨勢，控制食材成本。
- **市場攤商 (林阿姨, 55歲)**：需要知道北農今天的休市狀況與熱門農產品交易量。
- **精明家庭主婦/主夫 (Sarah, 40歲)**：依據當季盛產指南決定今日家常菜菜單，喜歡直覺、乾淨的介面。

### 📌 目標與痛點 (Goals & Pain Points)
- **Pain Points:** 傳統農委會 (MOA) 網站資料過於龐雜、手機極難閱讀、查不到歷史走勢、不知道哪天休市。
- **Goals:** 在 3 秒內看到關注作物的菜價與漲跌，一手掌握休市資訊與當季最划算食材。
- **Solution:** 打造符合 Apple Human Interface Guidelines (HIG) 的簡潔、專注、高質感的資訊儀表板。

---

## 2. 視覺語言與佈局矩陣 (Visual Language & Layout)

### 🎨 遵循 Apple HIG 的視覺規範
- **字體 (Typography):** 採用 `-apple-system, BlinkMacSystemFont, "Inter", "Noto Sans TC"`. 善用 Dynamic Type 標準尺寸 (Large Title, Headline, Body, Subheadline)，確保清晰易讀。
- **色彩 (Color Palette):**
  - **Primary:** Apple Green (近似 `SF Symbol` 中的綠色，用以象徵農業生機)。
  - **Background:** 行動端採 off-white (Light Mode) / true-black (Dark Mode)，支援自動深色模式。
  - **Semantic:** 跌價(綠色 - 代表變便宜)、漲價(紅色 - 代表變貴)。*注意：華人市場與股市相反，生鮮便宜是好消息，需加上箭頭明確標示。*
- **材質 (Materials/Glassmorphism):** 大量採用 Apple 的 "Vibrancy" 及 "Thin Material" 模糊效果 (Backdrop-filter blur 40px+)，在頂部 Navigation Bar 與底部 Tab Bar 營造通透感。
- **圓角 (Corner Radius):** 卡片採用 iOS 預設的連續曲線 (Continuous Curve)，半徑通常為 16pt (小型卡片) 到 24pt (大型區塊)。

### 📱 響應式策略 (Responsive Behavior)
- **Mobile First (iPhone):** 採用 Bottom Tab Bar 導航，單次專注單一任務。大字體、高觸控面積 (至少 44x44 pt)。
- **Desktop (Mac/iPad):** 自動轉換為側邊欄 (Sidebar) 或頂部多維導覽，展開 Grid 版面。支援滑鼠的 hover 漸變回饋。

---

## 3. 8 個核心畫面設計 (8 Core Screens Detail)

### 1️⃣ 首頁 (Home Dashboard)
- **Layout:** Large Title 引言「今日市場概況」。
- **Components:**
  - **Hero Card:** 全版毛玻璃卡片，顯示目前選擇市場的「今日均價」與「當日交易量」，並帶有動態走勢微型圖表 (Sparkline)。
  - **Chips:** 水平滑動的市場切換 Pill (台北一、台北二...)。
  - **Marquee:** 仿 Apple 股票 App 的跑馬燈，即時播報今日亮點。
- **Micro-interactions:** 下滑載入，Hero Card 會跟隨滾動產生視差 (Parallax) 縮放。

### 2️⃣ 各類別波動榜 (Top Movers)
- **Layout:** Masonry 或 2-Column Grid (Desktop) / 垂直 List (Mobile)。
- **Components:**
  - **排名卡片:** 每個卡片帶有一個 Emoji (例如 🥬 高麗菜)，並明確標示 `+15%` (紅色)。
  - **Category Tabs:** (蔬菜 / 水果 / 肉品家禽 / 漁產) iOS 標準 Segmented Control 風格。
- **Empty State:** 「今日市場行情平穩，無劇烈波動作物」。

### 3️⃣ 當季盛產指南 (Seasonal Guide)
- **Layout:** 橫向滑動的 Carousel (Pager) 佈局，利用 `snap-x` 形成分頁反饋。
- **Components:**
  - **Focus Card:** 鮮豔對比色的推薦卡片，包含巨大的蔬菜 Emoji 與盛產原因 (例如「近期氣候穩定，小白菜大量到貨」)。
- **Accessibility:** VoiceOver 朗讀順序為：「當季盛產：高麗菜，每公斤 25 元，便宜又好吃」。

### 4️⃣ 民生物資行情 (Livestock & Core Staples)
- **Layout:** 一目瞭然的 2x2 Grid 型錄。
- **Components:** 
  - 專注於雞蛋與毛豬。使用粗體數字 (San Francisco 數字字體特色：等寬 Tabular nums)。
  - 獨立的資料更新時間戳記 (Time stamp)。

### 5️⃣ 搜尋與探索頁 (Search & Explore)
- **Layout:** 頂部固定 Search Bar 帶有毛玻璃背景。
- **Components:**
  - **Search Input:** 內顯放大鏡圖示與清除按鈕 (Clear button)。
  - **Recent Searches:** 歷史紀錄列表。
  - **Keyboard:** 若為行動端，自動彈出並配有 "Search" (藍色) 右下角按鍵。

### 6️⃣ 作物詳情頁 (Produce Detail View)
- **Navigation:** Modal 式由下往上滑出，或 Stack 推進 (帶有原生返回按鈕)。
- **Components:**
  - **Price Chart:** 互動折線圖 (D3 / Recharts)，支援長按 (Long-press) 顯示特定日期的詳細價格。
  - **Stats Row:** 最高價、最低價、總交易量數據區塊。
- **Gesture:** 向右滑動返回上頁 (Swipe to pop)。

### 7️⃣ 個人自訂與設定 (Settings)
- **Layout:** iOS 標準的 `Inset Grouped Table` 外觀。
- **Components:**
  - 設定預設市場、偏好的首頁顯示類別 (蔬/果/肉)。
  - 切換深淺色模式。
  - **Toggle Switches:** Apple 標準的綠色 Switch。

### 8️⃣ 自選追蹤清單 (Watchlist)
- **Layout:** Tappable List，具有左滑刪除 (Swipe to Actions) 的手勢反饋。
- **Components:** 列出使用者關注的特定作物與其當日市價。

---

## 4. 元件與細節規範 (Components & Micro-Interactions)

- **觸控反饋 (Haptics):** 切換市場或將作物加入追蹤清單時，應有視覺上的輕微放大縮小 (Scale `0.97` 到 `1`)。
- **載入狀態 (Loading State):** 拋棄傳統的 Spinner，統一採用與內容結構一致的 **Skeleton UI** (骨架屏)，並帶有微弱的呼吸燈波浪特效動畫。
- **資料可視化 (Data Viz):** 若當日休市 (無資料)，圖表應不斷線 (Connect Nulls)，但將背景轉為斑馬紋，並標出小巧的「休市」標記，不影響使用者解讀長期趨勢。
- **無障礙設計 (Accessibility):**
  - 使用者調整裝置字體時 (Dynamic Type)，價格等重要數字應成比例放大而不截斷，必要時由單行轉為雙行摺疊排版。
  - 色彩對比必須符合 WCAG AA 級標準。不依賴純顏色來傳達漲跌 (需有輔助的箭頭或加減號)。

---

## 5. Designer's Notes
*"在打造這套系統時，我們不去干擾使用者。批發市場的日常運作非常快速，使用者通常在清晨一邊點貨一邊查看。所以我們移除了所有冗餘的邊框與裝飾性動畫，唯一的亮點是價格本身的變化。毛玻璃導航欄幫助用戶在上下滾動長長的品項清單時，仍保有環境空間感 (Spatial Context)。這不僅僅是一個工具，更是一個安靜、可靠的數位助手。"*
