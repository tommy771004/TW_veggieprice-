
skill: D:\Project\github\veggieprice_tw\.agents\skills\agent-browser\SKILL.md
API專區:https://data.moa.gov.tw/api.aspx
API文件: https://data.moa.gov.tw/apidocs.aspx

針對我現在專案的api 提出修改計畫

# Modernize MOA API Integration

The project currently uses the legacy ASPX Open Data endpoint from the Ministry of Agriculture (MOA). This plan outlines the transition to the more robust and modern v1 REST API (`/api/v1/AgriProductsTransType/`).

## User Review Required

> [!IMPORTANT]
> The new API uses standardized field names (e.g., `Avg_Price` instead of `平均價`). We need to ensure that all consumers of the normalized data are compatible with these changes.
> The date format in the request remains ROC (`YYY.MM.DD`), which our `isoToROC` utility already supports.

## Proposed Changes

### Backend Logic

#### [MODIFY] [moa.ts](file:///d:/Project/github/veggieprice_tw/src/lib/server/moa.ts)
- Update `MOA_BASE` to `https://data.moa.gov.tw/api/v1/AgriProductsTransType/`.
- Update `MOARawRecord` interface to match the new API response fields (using underscores and PascalCase).
- Refactor `fetchMOARecords` to:
    - Use new parameter names: `Start_time`, `End_time`, `CropName`, `MarketName`.
    - Handle the response structure where data is nested under the `Data` property.
    - Implement basic pagination support if the `Next` flag is present.
- Update `parseRecord` to map the new field names to the internal `NormalizedPriceRecord` structure.
- Clean up URL manipulations in `fetchMarkets` to use a cleaner base URL approach.

---

## Verification Plan

### Automated Tests
- I will run a script to test the new API endpoint with various parameters (date range, specific crop, specific market) to ensure the data is fetched and parsed correctly.
- Verify that pagination works if a large date range is requested.

### Manual Verification
- Test the search functionality in the UI to ensure vegetable prices are still loading correctly.
- Verify that the market filter and crop search continue to function as expected.
- Check the trend charts to ensure historical data is correctly retrieved from the new API.
