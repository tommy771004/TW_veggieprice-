# 食譜照片授權確認流程（SOP）

「今日精選食譜」的每道食譜有一個 `image` 欄位。**預設為 `null`，一律顯示 `CropIcon` 圖示。**
只有在**確認照片為開放授權**後，才可把 `image` 填成一個授權物件。本文件是把一張照片「上線」前必須走完的流程。

> 為什麼這麼嚴：本站含導購／聯盟版位，屬**商業性質**。多數政府平台（含農業部食農教育平臺）與商業食譜站的照片**預設仍受著作權法保護**，商業重製需另行取得授權。放錯照片可能收到下架要求或求償。

## 一、只有這些授權可以上線

`image.license` 必須是以下其中之一（都允許「附出處的商業重製散布」）：

| 授權碼 | 說明 |
| --- | --- |
| `OGDL-1.0` | 政府資料開放授權條款第 1 版（Taiwan Open Government Data License） |
| `CC-BY-4.0` | 姓名標示 |
| `CC-BY-SA-4.0` | 姓名標示—相同方式分享 |
| `CC0-1.0` | 公眾領域貢獻宣告 |
| `PDM-1.0` | 公眾領域標章（Public Domain Mark） |

清單定義於 `src/lib/recipesCore.ts` 的 `RECIPE_IMAGE_LICENSES`。**不在清單上的一律不可上線**——包括「保留所有權利」、僅授權「非商業」（CC-BY-NC）、或授權狀態不明的照片。

## 二、確認流程 checklist

對每一張候選照片，逐項確認、全部通過才可收錄：

1. **找到授權聲明**：在照片來源頁面找到明確的授權文字或標章（不是整站的一般聲明，而是**這張圖**的授權）。
2. **確認授權碼**：授權屬於上表其中之一。若寫「政府資料開放授權條款」→ `OGDL-1.0`；若是 CC 標章 → 對應版本。
3. **確認允許商業使用**：排除 `NC`（非商業）與「僅供個人／教學」字樣。
4. **確認可重製散布**：排除「僅供瀏覽、不得下載重製」。
5. **記下必要標示資訊**：作者／機關名稱（`attribution`）與來源網址（`sourceUrl`）。CC-BY／OGDL 都**要求標示**，本站會在食譜彈窗顯示。
6. **下載並放檔**：存到 `public/recipe-photos/`，檔名用食譜 `id`（例：`veg-tomato-egg.jpg`）。建議壓到長邊 ≤ 800px。
7. **填入 recipes.json**（見下）。
8. **跑守門測試**：`npm run test:unit` 必須綠（`recipesData.test.ts` 會擋掉不合規的 image）。

> 若任何一項不確定 → **維持 `image: null`**。圖示永遠是安全選項。

## 三、如何填進 `src/data/recipes.json`

把該食譜的 `image: null` 換成：

```json
"image": {
  "src": "/recipe-photos/veg-tomato-egg.jpg",
  "license": "OGDL-1.0",
  "attribution": "行政院農業部○○○",
  "sourceUrl": "https://data.gov.tw/dataset/xxxxx"
}
```

- `src`：`/public` 底下的路徑（或 data URI）。
- `license`：上表授權碼之一。
- `attribution`：要顯示的出處／作者，必填非空。
- `sourceUrl`：取得照片與其授權聲明的網址，必填非空。

## 四、系統會替你把關（兩道自動防線）

1. **建置期資料防線**：`src/lib/recipesData.test.ts` 會掃描整個 `recipes.json`，任何 `image` 若「非 null 又不符授權物件格式／授權碼」就會讓 `npm run test:unit` 失敗。
2. **執行期渲染防線**：卡片與彈窗都用 `isLicensedRecipeImage()`（`src/lib/recipesCore.ts`）判斷；**只要不通過就自動退回 `CropIcon`**，不會顯示未授權照片。

兩道防線都通過 `RECIPE_IMAGE_LICENSES` 這一份清單，改授權政策只需改一處。

## 五、找開放授權照片的建議來源

| 來源 | 授權狀態 | 備註 |
| --- | --- | --- |
| `data.gov.tw` / `data.moa.gov.tw` 上明確標 OGDL 的影像資料集 | 通常 `OGDL-1.0` | 需逐一確認**該資料集**的授權頁 |
| Wikimedia Commons | 逐張標示（多為 CC-BY / CC-BY-SA / CC0 / PDM） | 以**單張檔案頁**的授權為準 |
| Openverse（openverse.org） | 逐張 CC / 公眾領域 | 同上，逐張確認 |

⚠️ **不可直接用**：農業部食農教育平臺、愛料理、Cookpad 等的照片（受著作權保護，商業重製需授權）；Unsplash／Pexels 雖允許商用，但其自訂授權**不在**本站允許清單內，若要納入需先更新政策與 `RECIPE_IMAGE_LICENSES`。

## 六、相關檔案

- `src/lib/recipesCore.ts` — `RECIPE_IMAGE_LICENSES`、`RecipeImage`、`isLicensedRecipeImage`
- `src/lib/recipesData.test.ts` — 資料守門測試
- `src/components/pages/HomeSections/FeaturedRecipesSection.tsx` / `RecipeDetailSheet.tsx` — 照片 / 圖示渲染與出處標示
- `src/data/recipes.json` — 食譜目錄（`image` 欄位）
