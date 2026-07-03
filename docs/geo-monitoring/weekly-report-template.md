# GEO Citation Monitoring Weekly Report

Week of: YYYY-MM-DD
Site: https://veggieprice.tw
Tester:

## Summary

| Platform | Tests | Cited | Citation rate | Average position | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| ChatGPT | 10 | 0 | 0% | N/A | Manual/browser-assisted |
| Perplexity | 10 | 0 | 0% | N/A | API or manual |
| Gemini | 10 | 0 | 0% | N/A | Manual/browser-assisted |

## Test Prompts

Use `docs/geo-monitoring/prompts.json` as the source of truth. Run each prompt once per platform at minimum; for higher confidence, run each prompt 3 times and record the most common citation result.

## Detailed Results

| Prompt ID | Query | Platform | Cited veggieprice.tw? | Cited URL | Position | Description accuracy | Screenshot / Raw response |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| cabbage_today | 今日高麗菜批發價是多少？ | ChatGPT | No |  |  |  |  |
| cabbage_today | 今日高麗菜批發價是多少？ | Perplexity | No |  |  |  |  |
| cabbage_today | 今日高麗菜批發價是多少？ | Gemini | No |  |  |  |  |

## Accuracy Rubric

- Excellent: cites the correct crop/category/page and distinguishes wholesale from retail price.
- Good: cites VeggiePrice TW and gives a mostly correct explanation.
- Partial: mentions the site but cites a less relevant page or omits important caveats.
- Poor: does not cite the site, gives outdated facts, or confuses wholesale and retail prices.

## Follow-Up Actions

1. If `/produce/{crop}` pages are not cited, add more source-backed answer capsules and internal links for those crop pages.
2. If `/search` is not cited for general price-lookup prompts, strengthen the search explainer and HowTo content.
3. If `/insights` is not cited for rest-day prompts, add more market-specific rest-day examples.
4. If AI answers confuse wholesale and retail prices, repeat the distinction in homepage, search, and crop FAQ blocks.

## Change Log

- YYYY-MM-DD: Initial baseline.
