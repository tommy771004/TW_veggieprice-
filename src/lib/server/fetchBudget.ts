/**
 * Wall-clock budgets for optional page data.
 *
 * Prerendered pages must finish well inside Next.js's 60s
 * staticPageGenerationTimeout. `experimental.prerenderEarlyExit` defaults to
 * true, so a single upstream feed that hangs will retry 3× and then kill the
 * whole production build — even though every caller here already has a
 * fallback ready. Capping the wait keeps a slow or unreachable MOA feed a
 * content-quality problem instead of a deploy-blocking one.
 */

// Feeds that supply a page's primary content: worth a real wait, still far
// below the prerender budget.
export const MOA_PRERENDER_BUDGET_MS = 8000

/**
 * Resolves with `fallback` if `promise` overruns `ms` or rejects.
 * The losing promise is left to settle on its own; its result is discarded.
 */
export function withFetchBudget<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label: string,
): Promise<T> {
  // A late rejection must not surface as an unhandled rejection once the race
  // has already settled on the timeout branch.
  const guarded = promise.catch((error) => {
    console.warn(`${label}: fetch failed, using fallback`, error)
    return fallback
  })

  return Promise.race([
    guarded,
    new Promise<T>((resolve) => {
      setTimeout(() => {
        console.warn(`${label}: exceeded ${ms}ms budget, using fallback`)
        resolve(fallback)
      }, ms)
    }),
  ])
}
