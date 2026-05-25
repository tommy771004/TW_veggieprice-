# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-05-25
- Primary product surfaces: Home dashboard, search/listing, produce detail, watchlist, settings, PWA shell.
- Evidence reviewed: `README.md`, `AGENTS.md`, `src/app/layout.tsx`, `src/components/pages/HomeClient.tsx`, `src/components/layout/TopAppBar.tsx`, `src/components/ui/GlassCard.tsx`, `src/app/globals.css`, `tailwind.config.ts`, `src/lib/server/moa.ts`.

## Brand
- Personality: Trustworthy Taiwanese market companion; calm, data-rich, fresh, practical.
- Trust signals: MOA data attribution, update timestamps, clear market names, explicit error/empty states, stable route handlers.
- Avoid: Decorative-only visuals, single-hue monotony, noisy consumer finance aesthetics, oversized marketing hero patterns that hide the actual market data.

## Product goals
- Goals: Help shoppers, vendors, and market watchers understand current crop prices quickly; make market changes and rest-day/weather context visible; keep Vercel deployment simple.
- Non-goals: Trading advice, predictive pricing claims, complex admin workflows, dependency-heavy visualization layers.
- Success signals: First screen answers "what changed today?", search remains fast, chart gaps are understandable, slow or failed upstream data degrades clearly.

## Personas and jobs
- Primary personas: Household buyers checking daily prices; small food businesses watching costs; market observers comparing crops and markets.
- User jobs: Scan today's average price and volume; find a crop; compare markets; follow volatile items; understand whether missing data is a rest day.
- Key contexts of use: Mobile-first quick checks, outdoor or commuting usage, intermittent network, repeated daily visits.

## Information architecture
- Primary navigation: Home, Search, Seasonal, Watchlist, Settings.
- Core routes/screens: `/`, `/search`, `/seasonal`, `/produce/[id]`, `/watchlist`, `/settings`.
- Content hierarchy: Market status and search first; volatility and commodity cards second; seasonal/insight modules after the primary price task.

## Design principles
- Principle 1: Data first, atmosphere second. Immersion should frame live market signals rather than obscure them.
- Principle 2: Compact but breathable. Mobile cards need scan-friendly hierarchy without turning the page into a landing page.
- Tradeoffs: Use motion and glass sparingly because users may visit on lower-power mobile devices; prefer CSS and existing components over new dependencies.

## Visual language
- Color: Use green as the trust anchor, amber for price emphasis, red only for risk/increase warnings, and neutral surfaces for dense information.
- Typography: Keep large numeric values prominent; keep labels small but readable; avoid viewport-scaled type.
- Spacing/layout rhythm: Use consistent section spacing with tighter internal metric groups for dashboard density.
- Shape/radius/elevation: Existing glass system is canonical; cards may use 16-24px radius where already established, while controls stay predictable.
- Motion: Spring entrance is acceptable for dashboard cards; respect reduced motion and avoid continuous decorative animation.
- Imagery/iconography: Use concrete produce/market symbols and material icons; avoid generic abstract backgrounds.

## Components
- Existing components to reuse: `GlassCard`, `TrendChip`, `SkeletonCard`, `WeatherRiskCard`, `DataSourceBadge`, app navigation.
- New/changed components: Home hero may gain richer market-stage layers and compact insight chips; data helpers may be extracted from `moa.ts`.
- Variants and states: Loading, partial upstream failure, rest day, weather risk, high price-change alert, empty category, reduced motion.
- Token/component ownership: `tailwind.config.ts` and `src/app/globals.css` own tokens and glass classes; page components own composition only.

## Accessibility
- Target standard: WCAG 2.1 AA for contrast, keyboard access, and readable responsive layouts.
- Keyboard/focus behavior: Search, select, chips, cards, and dismiss buttons must remain focusable with visible focus rings.
- Contrast/readability: Text on dark hero must maintain strong contrast; small labels should not rely on transparency alone.
- Screen-reader semantics: Interactive cards need descriptive text; decorative visuals should be hidden from assistive tech.
- Reduced motion and sensory considerations: Existing `prefers-reduced-motion` rule is required; new motion must work when reduced.

## Responsive behavior
- Supported breakpoints/devices: Mobile first, tablet two-column modules, desktop constrained max width.
- Layout adaptations: First screen should keep the key market card visible on mobile; desktop may use secondary insight rails inside the hero.
- Touch/hover differences: Hover lift is enhancement only; touch targets stay at least 44px.

## Interaction states
- Loading: Skeletons should preserve final dimensions and avoid major layout shift.
- Empty: State why data is absent and provide a next action.
- Error: Show upstream failure without implying user fault; keep retry available.
- Success: Emphasize update time, market, average price, volume, and trend.
- Disabled: Use muted contrast plus semantic disabled attributes when controls cannot act.
- Offline/slow network, if applicable: PWA shell and service worker should preserve core navigation while API failures show local empty states.

## Content voice
- Tone: Clear, local, concise, practical.
- Terminology: Use Taiwanese market terms such as `均價`, `交易量`, `休市`, `市場`, and `作物`.
- Microcopy rules: Prefer short labels near data; explain unusual states like rest days or interpolated chart points only where they appear.

## Implementation constraints
- Framework/styling system: Next.js 15 App Router, React 19, Tailwind CSS, Framer Motion, Recharts.
- Design-token constraints: Keep existing color tokens and glass utility classes; do not add a design-system dependency.
- Performance constraints: Vercel route handlers should minimize upstream calls, repeated parsing, and O(n^2) post-processing.
- Compatibility constraints: PWA, dark mode, font-size preferences, and no persistent Express API service.
- Test/screenshot expectations: Data processing changes need targeted automated tests; visual changes need build/type validation and, when a dev server is available, browser inspection.

## Open questions
- [ ] Confirm whether future Figma work should produce a separate visual reference or simply document the repo-native design contract.
- [ ] Confirm whether commodity modules should remain on the home page or move behind insights if the first screen becomes too dense.
