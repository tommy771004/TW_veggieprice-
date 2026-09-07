# 行情品項水彩插圖

供搜尋結果、首頁漲跌排行、單品頁市場比價列使用。插圖由實物照片參考生成，並非商品實拍；品名與價格仍取自既有行情資料。

## 清單與對應

- `inventory.json`：掃描每日 JSON 與現行資料後，以「分類＋品名」去重，保留所有原始名稱、代碼及現行／歷史範圍。統計位於 `summary`。
- `batch-*.json`、`single-*.json`：每張參考照片的來源網頁、照片 URL、原始品名、品種判斷與例外說明。批次格子順序對應已生成圖集，**不可重新排序**。
- `asset-manifest.json`：完整插圖及名稱對應，最新覆蓋數位於 `coverage`。
- `src/lib/ingredientImages.json`：只含前端需要的圖片路徑、裁切座標、分類與名稱／代碼查表，不包含本機照片路徑。
- `sprite-regions.json`、`sprite-clips.json`：顯示範圍及格子邊界，透過 CSS 呈現，不改寫原始圖集像素。

同品種且外觀相同的產地、進口或包裝差異可共用插圖；顏色、品種外觀、加工狀態和部位不同則分開。魚貨交易名稱可能涵蓋多個物種，使用圖鑑明列或官方類別包含的代表物種時，會在 `mappingMethod` 與 `mappingNote` 註明，不視為精確物種鑑定。

「休市」不是商品。「其他」、混合類別、身份尚待確認的品名或缺乏可信照片者暫不建立新插圖對應，介面沿用原本的 CropIcon 圖示；新插圖不以關鍵字猜測圖像。花卉與水果即使同名，也使用不同分類查表。

## 來源

主要來源包括 [臺北農產運銷品項資料](https://www.tapmc.com.tw/Pages/Market/Packing/G000C1)、[農業部食農教育平臺](https://fae.moa.gov.tw/)、[農業知識入口網魚類圖鑑](https://kmweb.moa.gov.tw/)、[漁業署交易分類圖鑑](https://efish.fa.gov.tw/efish/common/atlaslist.htm)，以及各批次列出的種苗商、農家和花材供應商實拍頁。

下載的研究照片與網頁快取保留於本機（生成用照片參考板截圖已於收尾清除，可重新產生），不隨前端發送，也不納入 Git；各筆原始 URL 保留在 metadata。AI 生成 PNG 母檔位於 `public/images/ingredients/`，同名 WebP 是格式壓縮版本，供前端優先使用。

## 更新與驗證

在專案根目錄執行：

```sh
python3 docs/ingredient-images/inventory-products.py
python3 docs/ingredient-images/measure-atlas-regions.py
node docs/ingredient-images/encode-atlases.cjs
python3 docs/ingredient-images/build-asset-manifest.py
python3 docs/ingredient-images/validate-assets.py
```

像素邊界分析需要 Pillow，格式壓縮使用專案環境可用的 Sharp。`inventory-products.py` 會更新資料清單；其後必須重建 manifest。來源批次準備腳本用於新增參考資料，不要覆蓋已生成圖集所對應的批次順序。

`prepare-contact-sheet.py 批次名稱` 產生 HTML 實拍參考板。先目視確認照片身份，再以 Image Gen 製作插圖並檢查位置、部位與顏色；無法確定者標記 `skipReason`。產生新圖集後執行上述邊界分析、壓縮、編譯和驗證步驟，並目視檢查 `sprite-edge-review.json` 列出的項目。

本機核對頁 `preview.html` 可依分類、品名、狀態與資料範圍查詢，並列插圖和原始實拍。以 8766 埠提供本目錄、8767 埠提供 `public/` 後開啟即可。未完成品項可在「尚未完成」篩選中直接查看。

## 本次收尾

依使用者要求暫停找圖與新增生成。已完成 657 張品項插圖，對應 758 個現行及歷史名稱；現行 913 個名稱中有 686 個使用新插圖，其餘沿用原本圖示。核對頁「尚未完成」指尚無新插圖，不表示產品介面留白。
