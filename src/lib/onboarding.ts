/**
 * First-visit onboarding sheet, shared by the root layout (server) and
 * OnboardingModal (client).
 *
 * The sheet is server-rendered on `/` so it paints with the first frame: when it
 * waited for hydration it became the page's LCP element ~2.5 s late. Returning
 * visitors must never see it flash, so a blocking <head> script marks <html>
 * before the body paints and CSS hides the sheet.
 */
export const ONBOARDING_STORAGE_KEY = 'veggieprice_onboarding_seen'

export const ONBOARDING_SEEN_ATTR = 'data-onboarding-seen'

/** Inline <head> script: flag <html> when the visitor already finished onboarding. */
export const ONBOARDING_HEAD_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(ONBOARDING_STORAGE_KEY)}))document.documentElement.setAttribute(${JSON.stringify(ONBOARDING_SEEN_ATTR)},'')}catch(e){}`

/** Hides the sheet for returning visitors, and for no-JS visitors who couldn't close it. */
export const ONBOARDING_HIDE_CSS = `html[${ONBOARDING_SEEN_ATTR}] .onboarding-root{display:none}`
