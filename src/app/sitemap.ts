import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/env'
import { COMMON_CROPS } from '@/lib/crops'

const CATEGORY_SLUGS = ['vegetable', 'fruit', 'mushroom', 'flower']

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,               lastModified: now },
    { url: `${base}/search`,   lastModified: now },
    { url: `${base}/seasonal`, lastModified: now },
    { url: `${base}/healthy-basket`, lastModified: now },
    { url: `${base}/insights`, lastModified: now },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) => ({
    url:          `${base}/produce/category/${slug}`,
    lastModified: now,
  }))

  const cropRoutes: MetadataRoute.Sitemap = COMMON_CROPS.map((crop) => ({
    url:          `${base}/produce/${encodeURIComponent(crop)}`,
    lastModified: now,
  }))

  return [...staticRoutes, ...categoryRoutes, ...cropRoutes]
}
