# Homepage top loading bar

## Problem Statement

When a visitor lands on 農時價 the homepage, the hero market card and the 波動榜 (top movers list) both start empty and show skeleton placeholders while their data loads. There is currently no indication of overall progress during this wait — the user sees skeletons but has no sense of how much longer initialization will take, which reads as "loading takes too long" even when the underlying fetches are within normal bounds.

## Solution

Add a thin, light-green progress bar fixed to the very top of the viewport (above the sticky header) that appears whenever the homepage's primary data (market overview + top movers) is still loading, animates toward completion, and fades out the moment that data has settled — success or error. The bar does not track literal per-request completion; it's a simulated indicator, matching the standard "top loading bar" pattern used across the web.

No new caching layer is introduced. The site has no existing local cache of homepage market data today (only user preferences, watchlist, search history, and an onboarding flag live in `localStorage`), so the bar is driven purely by the homepage's existing loading state, not by cache presence/absence.

## User Stories

1. As a first-time visitor, I want to see a clear loading indicator at the top of the page while the homepage's market data loads, so that I know the page is working and not stuck.
2. As a returning visitor (no data is cached client-side today), I want to see the same loading indicator on every visit, so that the experience is consistent regardless of visit history.
3. As a visitor on a slow connection, I want the bar to keep animating smoothly rather than appear frozen, so that a long wait doesn't feel like a broken page.
4. As a visitor on a fast connection, I want the bar to complete and disappear quickly rather than lingering, so that it doesn't feel like unnecessary friction on an already-fast load.
5. As a visitor, I want the bar to disappear as soon as the hero card and top-movers list have finished loading, so that it doesn't stay visible after the content I care about is ready.
6. As a visitor, I want the bar to also disappear if the market overview or movers request fails (not just on success), so that a failed request doesn't leave the bar stuck on screen forever.
7. As a visitor who switches the produce category (蔬菜/水果/肉品/漁產), I want to see the same loading indicator reappear while that category's data reloads, so that the loading treatment is consistent with the skeletons already shown during category switches.
8. As a visitor who switches the selected market, I want the same loading indicator behavior during that reload, for the same reason.
9. As a mobile visitor, I want the bar to render correctly at the top of a narrow viewport without overlapping or being obscured by the header, so that it's visible and unobtrusive on small screens.
10. As a screen-reader user, I want the decorative loading bar to not be announced as a literal, numerically-accurate progress value, so that I'm not given misleading information (the trickle percentage is simulated, not real).
11. As a visitor, I want the bar's color to match the site's existing design language (light green, consistent with the brand palette), so that it doesn't look like a foreign or mismatched UI element.
12. As a visitor, I want the bar to disappear with a brief fade rather than an abrupt cut, so that the transition feels consistent with the rest of the site's motion design.
13. As a developer maintaining this codebase, I want the loading bar to be a small, isolated, reusable component driven by a single boolean input, so that its animation logic is easy to reason about and doesn't leak into `HomeClient`'s existing data-fetching logic.
14. As a QA engineer, I want automated test coverage confirming the bar appears during a slow load and disappears once loading completes, so that regressions in this behavior are caught without manual verification.
15. As a visitor who navigates away from the homepage mid-load, I want the bar to only ever apply to the homepage's own loading state, not to persist as a global route-transition indicator across the rest of the site, so that its scope stays predictable and limited.

## Implementation Decisions

- **New component**: a small, presentational client component (colocated with the other homepage-scoped UI primitives) whose only responsibility is rendering the bar and its animation, given an `active: boolean` prop. It owns no data-fetching or business logic.
- **Trigger/gating logic**: `HomeClient` already tracks `loadingOverview` (gates the hero card skeleton) and `loadingMovers` (gates the top-movers skeleton). The new component's `active` prop is computed as `loadingOverview || loadingMovers` — visible while either is true, hidden once both are false.
  - This means the bar reappears on category switches and market switches, not just the very first mount, because those interactions already re-trigger both flags today (and already re-show the existing skeletons). This is intentional: the bar's visibility mirrors the same loading concept already visible elsewhere on the page, rather than being special-cased to "first load only."
  - Because `loadingOverview`/`loadingMovers` are both cleared in their fetch effects' `finally`/error branches today, the bar clears on both success and failure — no separate error-handling path needed.
- **No new caching layer**: explicitly out of scope (see below). The bar's trigger is "homepage's primary data isn't ready yet," which is simply the existing loading state, since nothing is cached today.
- **Progress mechanics — simulated, not literal**: on `active` transitioning false→true, animate a width percentage from 0 toward an asymptotic ceiling around 90% over an indeterminate duration (eased so it slows down as it approaches the ceiling, since the true duration is unknown). On `active` transitioning true→false, snap the width to 100% and then fade the whole bar out over roughly 200–300ms before unmounting/hiding it. On the next false→true transition, reset back to 0% before trickling again.
- **Visual spec**: a thin bar, roughly 2–3px tall, spanning the full viewport width, using the existing `primary-fixed` (#a3f69c) design token for its fill color — no new color introduced.
- **Positioning**: fixed to the true top of the viewport (`position: fixed; top: 0`), with a z-index above the existing sticky `TopAppBar` (which is `z-50`), so the bar always sits above the header regardless of scroll position.
- **Animation implementation**: use `framer-motion`, consistent with the rest of `HomeClient` and the broader component tree, which already uses `m`/`AnimatePresence` for comparable state-driven transitions (skeleton-to-content swaps, dismissible banners).
- **Accessibility**: the bar is decorative and should not be exposed to assistive tech as a literal progress value (e.g. `aria-hidden="true"`), since its percentage is simulated rather than tied to real completion — the underlying content's own loading/loaded states remain the accurate source of truth for screen-reader users.
- **Scope boundary**: the component and its trigger logic live entirely within the homepage's data-loading flow (`HomeClient`). It is not wired into Next.js router/navigation events and does not apply to any other route.

## Testing Decisions

- Good tests here assert **externally observable behavior** — the bar's visible presence/absence and rough timing relative to network activity — not its internal state variables, animation frame values, or exact interpolation math.
- **Modules under test**: the homepage (`/`) as rendered in a real browser, with the underlying overview/movers API calls intercepted to control timing.
- **Seam**: Playwright E2E, the only test seam currently available in this repo (see Prior Art). Use route interception (e.g. `page.route()`) on the overview and movers API endpoints to artificially delay their responses, then assert:
  1. While those responses are pending, the bar element is present/visible in the DOM.
  2. Once both responses resolve, the bar is no longer visible (removed or faded out).
  3. Triggering a category switch (e.g. clicking the 水果 chip) with the same delayed-response setup causes the bar to reappear, then disappear again once the reloaded data settles.
- **Prior art**: none. This repository has Playwright configured (`playwright.config.ts`, pointing at `tests/e2e`) but the `tests/` directory does not yet exist and no tests have been written — this will be the first test in the codebase. No unit/component test runner (Vitest, Jest, Testing Library) is installed, so component-level isolation testing is not available; E2E is the only seam.

## Out of Scope

- Any performance fixes to the underlying data-fetching (uncached JSON reads, unbatched parallel requests, etc.) identified during the accompanying performance diagnosis — that diagnosis is a separate, non-code deliverable and is not part of this spec.
- Building a `localStorage`-backed cache of homepage market data for instant repeat-visit rendering (considered and explicitly rejected in favor of the simpler "show while loading" behavior).
- A global, router-level navigation progress bar (e.g. an NProgress-style indicator that fires on every route change across the whole site) — this spec covers only the homepage's own data-loading state.
- Literal per-request ("N of M fetches complete") progress tracking — the bar's percentage is simulated, not computed from actual request completion counts.
- Extending loading-state tracking to the market-list, rest-days, or weather-risk requests — the bar's gating remains limited to the two flags that already drive the existing hero/movers skeletons.

## Further Notes

- This spec covers only the loading-bar feature (item 2 of the original request). The performance diagnosis (item 1) is being delivered separately as a written findings report, not as implementation work — see the conversation history for the confirmed findings (uncached `fetchMarketRestDays` parsing on every homepage load; uncached multi-MB JSON reads on seafood/meat category paths; 5–6 uncoalesced parallel fetches on mount; and the intentional SSR-skip trade-off in `page.tsx` that produces the client-side loading states in the first place).
- The pre-existing architectural decision to skip SSR data-fetching on the homepage (for fast TTFB, per an existing code comment) is the direct reason client-side loading states — and therefore this bar — exist at all. If that trade-off is ever revisited, this bar's necessity should be reconsidered alongside it.
