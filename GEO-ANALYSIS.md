# GEO Analysis Report

Date: 2026-07-03
Site: https://veggieprice.tw
Project: VeggiePrice TW / 農時價

## Executive Summary

GEO readiness score: 70/100

The project already has a strong technical base for AI search visibility: App Router metadata, robots.txt, sitemap.xml, visible FAQ schema, product-level Dataset schema, breadcrumb schema, a root llms.txt file, and server-rendered produce summaries. The main remaining gap is content depth on hub pages. The most valuable crop pages are becoming citeable, but search, category, seasonal, and insights pages still need answer-first summaries, structured lists, and schema that AI systems can extract without running client JavaScript.

## Implementation Progress

Updated: 2026-07-03

- P0 completed: Added server-rendered GEO summaries for `/search`, `/insights`, `/seasonal`, and `/produce/category/*`.
- P1 completed: Added reusable `WebPageJsonLd`, `ItemListJsonLd`, and `HowToJsonLd`; removed Product/Offer JSON-LD from crop pages to avoid ecommerce ambiguity.
- P2 completed: Rewrote `public/llms.txt` into the guide's bilingual structure under 50 lines.
- P3 completed: Added `docs/geo-monitoring/prompts.json` and `docs/geo-monitoring/weekly-report-template.md` for weekly AI citation tracking.

## Current Strengths

- `src/app/layout.tsx` defines global title templates, canonical base, Open Graph, Twitter card, manifest, and site-wide Organization/WebSite/WebApplication JSON-LD.
- `src/app/robots.ts` allows public pages and blocks `/api/` while keeping `/api/og` crawlable.
- `src/app/sitemap.ts` includes homepage, search, seasonal, insights, category hubs, and all `COMMON_CROPS` produce pages.
- `public/llms.txt` exists and tells AI crawlers which public pages to cite instead of `/api/prices/*`.
- `src/components/seo/FaqSection.tsx` renders visible FAQ content and matching FAQPage JSON-LD from the same source array.
- `src/app/produce/[id]/page.tsx` renders Dataset, FAQ, Breadcrumb, and conditional Product JSON-LD for each crop page.
- `src/components/seo/ProduceMarketSummary.tsx` adds crawlable prose and tables with real prices, market comparison, recent trading days, and crop facts.
- `src/components/seo/HomeSeoLinks.tsx` gives the homepage a crawlable internal link graph into categories and important crop pages.

## Main Gaps

### 1. Hub pages are still thin for GEO

Affected files:
- `src/app/search/page.tsx`
- `src/components/pages/SearchContent.tsx`
- `src/app/produce/category/[category]/page.tsx`
- `src/app/seasonal/page.tsx`
- `src/app/insights/page.tsx`

Search and insights rely heavily on client components. Their initial HTML has UI controls but not enough answer-first factual text. Category and seasonal pages are server-rendered, but they are mostly link lists/cards and do not yet provide self-contained answer blocks, statistics, FAQ, or ItemList schema.

Recommended fix:
- Add server-rendered SEO summary components for `/search`, `/insights`, `/seasonal`, and category hubs.
- Each summary should start with a direct 40-60 character answer capsule, then include a table of facts and links to the most relevant crop/category pages.
- Add FAQPage schema where questions are visible on the page.
- Add ItemList schema for category crop lists and seasonal crop lists.

### 2. llms.txt is present but not fully aligned with the guide

Affected file:
- `public/llms.txt`

The guide asks for bilingual Traditional Chinese + English and sections for About, Core Advantages, Important Documents, Use Cases, and Licensing. The current file is useful but mostly Chinese, uses a custom structure, and only includes a small featured crop set.

Recommended fix:
- Keep it under 50 lines, but add bilingual section labels and short English summaries.
- Add a licensing/source section with the MOA source and "site data is reference only" note.
- Include canonical high-value content paths: homepage, search, seasonal, insights, four category hubs, and representative crop pages.

### 3. AI search crawler policy mixes search bots and training bots

Affected file:
- `src/app/robots.ts`

The `aiBots` group includes search/citation bots such as `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, and `ClaudeBot`, but also broader training/control crawlers such as `Google-Extended`, `Applebot-Extended`, and `CCBot`. That is not necessarily wrong, but the comment says they are all for search citation. This makes future policy changes easy to misunderstand.

Recommended fix:
- Split robots rules into `aiSearchBots` and `trainingBots`.
- Explicitly allow search/citation bots.
- Decide whether training bots should be allowed or blocked. If allowed, document the choice as a visibility tradeoff.

### 4. Product schema may overstate ecommerce intent

Affected files:
- `src/components/seo/JsonLd.tsx`
- `src/app/produce/[id]/page.tsx`

`ProduceProductJsonLd` emits Product + Offer for a wholesale price page. This helps AI understand "price", but it can confuse Google rich results because the site is not selling the crop directly. Dataset schema is the better primary schema for these pages.

Recommended fix:
- Keep Dataset as the canonical schema.
- Either remove Product schema or make it clearly secondary with conservative fields.
- If Product remains, add `category`, `priceSpecification`, `seller` or `offeredBy`, and a clear description that the price is a market reference, not a direct sale.

### 5. GEO monitoring is not implemented

The guide recommends recurring tests across Perplexity, ChatGPT, and Gemini. The project currently has no prompt set, result schema, report file, or automation for citation monitoring.

Recommended fix:
- Add `docs/geo-monitoring/prompts.json` with 10 Taiwan produce/price prompts.
- Add a script that can ingest manual or API results and generate `docs/geo-monitoring/report.md`.
- Make Perplexity API optional through env vars, and keep ChatGPT/Gemini as manual/browser-assisted workflows.

## Page-Level Diagnosis

| Page | Current GEO status | Main improvement |
| --- | --- | --- |
| `/` | Good. Has metadata, JSON-LD, FAQ, llms link, and crawlable internal links. | Make the GEO section more answer-capsule dense and include 1-2 more source-backed statistics. |
| `/produce/[id]` | Strong. Has crawlable data tables, Dataset/FAQ/Breadcrumb schema, and real statistics. | Revisit Product schema and add source/date freshness more consistently. |
| `/produce/category/[category]` | Medium. Good crawlable links, but thin factual content. | Add ItemList schema, category FAQ, and an answer-first category market summary. |
| `/search` | Weak-medium. Metadata exists, but main content is client-side. | Add a server-rendered search explainer, common query links, FAQ, and HowTo schema. |
| `/seasonal` | Medium. Server-rendered cards exist. | Add ItemList schema, FAQ, canonical/Open Graph, and direct crop detail links. |
| `/insights` | Weak-medium. Metadata exists, but rest-day data is client-side. | Add server-rendered market rest-day summary and FAQ/HowTo schema. |
| `/watchlist`, `/settings` | Correctly noindex. | Keep out of sitemap and search landing strategy. |

## Priority Implementation Plan

### P0: Fix crawler-facing hub content

1. Create `SearchSeoSummary` for `/search`.
2. Create `InsightsSeoSummary` for `/insights`.
3. Add `CategoryHubSeoSummary` and ItemList JSON-LD for category pages.
4. Add `SeasonalItemListJsonLd` and FAQ to `/seasonal`.

Success criteria:
- Each indexable hub page has at least one H1, two question-style H2/H3 headings, one answer capsule, one source mention, and visible internal links to relevant pages.

### P1: Clean structured data semantics

1. Add reusable `ItemListJsonLd`, `HowToJsonLd`, and `WebPageJsonLd` helpers.
2. Review `ProduceProductJsonLd` and either remove it or make it explicitly market-reference oriented.
3. Add `dateModified` consistently only where it will not create hydration or cache churn problems.

Success criteria:
- JSON-LD is valid, visible FAQ text matches FAQPage schema, and product rich result ambiguity is reduced.

### P2: Align llms.txt with the workflow guide

1. Rewrite `public/llms.txt` into the guide structure: About, Core Advantages, Important Documents, Use Cases, Licensing.
2. Add short English summaries while keeping the file concise.
3. Keep "do not cite APIs" guidance.

Success criteria:
- Root `/llms.txt` remains under 50 lines and is useful to both humans and AI crawlers.

### P3: Add GEO monitoring assets

1. Add prompt set for Taiwan produce price queries:
   - "今日高麗菜批發價"
   - "台灣今日菜價查詢"
   - "台北批發市場蔬菜價格"
   - "香蕉批發價走勢"
   - "台灣水果批發行情"
   - "批發價和零售價差多少"
   - "哪裡查農產品批發價格"
   - "台灣市場休市日查詢"
   - "當季便宜蔬果推薦"
   - "農業部農產品交易行情怎麼看"
2. Add a manual result template for ChatGPT, Perplexity, and Gemini.
3. Optional: add Perplexity API script when credentials exist.

Success criteria:
- Weekly citation-rate report can be produced without changing application code.

## Recommended First Code Changes

1. Add `src/components/seo/SearchSeoSummary.tsx` and render it below `SearchContent`.
2. Add `src/components/seo/InsightsSeoSummary.tsx` and render it before `InsightsClient`.
3. Extend `JsonLd.tsx` with `ItemListJsonLd` and reuse it in category and seasonal pages.
4. Rewrite `public/llms.txt` to the guide's bilingual structure.
5. Refactor `robots.ts` bot groups for clearer policy.

## Verification Plan

- Run `npx tsc --noEmit`.
- Run targeted ESLint on changed files.
- Build if the local Next build does not hang on environment/network resources.
- Manually inspect generated HTML for `/`, `/search`, `/seasonal`, `/insights`, and one `/produce/[id]` page.
- Validate JSON-LD with Schema.org Validator or Google Rich Results Test after deployment.
- Check live `/robots.txt`, `/sitemap.xml`, and `/llms.txt` after Vercel deployment.

## Known Constraints

- Live AI citation testing was not performed in this analysis because it requires Perplexity API credentials or logged-in browser sessions for ChatGPT/Gemini.
- Current git status shows `.codegraph/daemon.pid` modified and `geo-workflow-guide.md` untracked. These appear unrelated to the application SEO implementation.
