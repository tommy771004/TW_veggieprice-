# Item Detail UI/UX Audit

Date: 2026-08-09
Target: `/produce/%E9%AB%98%E9%BA%97%E8%8F%9C`
Viewport checks: 1280px desktop and 390px mobile

## Captured steps

1. `01-initial-detail.png` - First visit with the onboarding overlay. The detail page is visible behind a blurred modal.
2. `02-detail-default.png` - Default detail page after skipping onboarding.
3. `03-watchlist-added.png` - Watchlist action changes to `已加入關注`.
4. `04-hero-collapsed.png` - Hero summary collapses successfully.
5. `05-period-3m.png` - The 3M period can be selected, but the current data state still shows no recent transactions.
6. `06-mobile-detail.png` - Mobile detail page at 390px.
7. `07-faq-expanded.png` - FAQ disclosure opens successfully.
8. `08-mobile-faq-viewport.png` - Mobile FAQ viewport showing the fixed bottom navigation overlapping the fourth question.
9. `10-dark-detail-top.png` - Dark theme detail page at the top of the screen.

## Findings

### High priority

- Mobile fixed bottom navigation can cover the focused or next FAQ item. Add bottom-safe scrolling space or `scroll-margin-bottom` for disclosures and anchors. Evidence: `08-mobile-faq-viewport.png`.
- The core price chart and volume chart are absent from the accessibility tree and have no text alternative. Add chart labels and a concise data table or summary. Code: `src/components/charts/PriceLineChart.tsx:116`, `src/components/charts/VolumeBarChart.tsx:63`.
- The page requests `/api/prices/markets` and `/api/weather`, which returned 404 during the audit. Market comparison is then omitted and weather becomes a dead-end empty state. Surface the error with a retry or explain the unavailable source. Code: `src/components/pages/ProduceClient.tsx:981`, `src/components/pages/ProduceClient.tsx:1084`.

### Medium priority

- The item has a back button but no breadcrumb or explicit parent destination. `router.back()` is fragile when the page is opened directly. Code: `src/components/pages/ProduceClient.tsx:620`.
- Period, range, market-scope, and watchlist controls communicate selection mainly through color. Add `aria-pressed`, explicit focus styles, and `type="button"`. Code: `src/components/pages/ProduceClient.tsx:630`, `829`, `846`, `867`.
- `PriceLineChart` starts at `opacity: 0` and relies on Motion to reveal the chart. Keep the chart visible by default and animate only after the fallback is rendered. Code: `src/components/charts/PriceLineChart.tsx:118-123`.
- A 390px viewport measured `document.documentElement.scrollWidth = 392`. Remove the 2px page overflow introduced by the negative-margin stage. Code: `src/components/pages/ProduceClient.tsx:647`.
- The weather error state has no retry action and is not announced as an async error. Add `role="alert"` or `aria-live` plus a retry path. Code: `src/components/pages/ProduceClient.tsx:978-1001`.

### Lower priority

- Decorative Material Symbols in the update row, field-note toggle, weather cards, and FAQ disclosure should use `aria-hidden="true"`. FAQ summaries also need a visible `:focus-visible` treatment. Code: `src/components/pages/ProduceClient.tsx:682`, `782-791`, `988-990`; `src/components/seo/FaqSection.tsx:42-48`.
- The initial onboarding overlay blocks the detail page on first visit. Keep it skippable, but consider a less disruptive entry treatment for a user who came directly to an item URL. Evidence: `01-initial-detail.png`.

## Checklist result

- Clear title or identifier: Pass. The crop name is the page `h1`.
- Status indicator: Partial. Category and data-window labels exist; price freshness and unavailable-data states need stronger textual semantics.
- Key details: Partial. The page has a strong set of sections, but the primary price is `--` in the audited data state and the page becomes very long.
- Edit action: Not applicable. This is a public market record, not user-owned editable data.
- Related items or activity: Partial. History, traceability, and guide sections exist; market comparison fails in the audited request state.
- Breadcrumb or back navigation: Partial. Back button exists, but no breadcrumb or safe direct-entry fallback.
- Destructive actions: Not applicable. Watchlist removal is reversible and not a record deletion.
