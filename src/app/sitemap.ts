import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/env'
import { COMMON_CROPS } from '@/lib/crops'
import { todayISO } from '@/lib/server/dateUtils'

const CATEGORY_SLUGS = ['vegetable', 'fruit', 'mushroom', 'flower']

// Regenerate hourly so `today` doesn't freeze at the last build date.
export const revalidate = 3600

// lastmod must be truthful or Google learns to ignore it for the whole site:
// price-driven pages change every trading day, the seasonal guide monthly, and
// static pages (about / privacy) carry no lastmod at all.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL
  const today = todayISO()
  const monthStart = `${today.slice(0, 7)}-01`

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,               lastModified: today },
    { url: `${base}/search`,   lastModified: today },
    { url: `${base}/seasonal`, lastModified: monthStart },
    { url: `${base}/healthy-basket`, lastModified: today },
    { url: `${base}/insights`, lastModified: today },
    { url: `${base}/about` },
    { url: `${base}/privacy` },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) => ({
    url:          `${base}/produce/category/${slug}`,
    lastModified: today,
  }))

  const cropRoutes: MetadataRoute.Sitemap = COMMON_CROPS.map((crop) => ({
    url:          `${base}/produce/${encodeURIComponent(crop)}`,
    lastModified: today,
  }))

  return [...staticRoutes, ...categoryRoutes, ...cropRoutes]
}
