// Thin wrapper so server files can read NEXT_PUBLIC_* without requiring @types/node
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _env: Record<string, string | undefined> = (globalThis as any).process?.env ?? {}

function normalizeSiteUrl(url: string): string {
	const trimmed = url.trim().replace(/\/+$/, '')
	return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}

const resolvedSiteUrl = _env.NEXT_PUBLIC_SITE_URL
	?? _env.VERCEL_PROJECT_PRODUCTION_URL
	?? _env.VERCEL_URL
	?? 'https://veggieprice.tw'

export const SITE_URL: string = normalizeSiteUrl(resolvedSiteUrl)

export const GOOGLE_SITE_VERIFICATION: string | undefined =
  _env.GOOGLE_SITE_VERIFICATION
