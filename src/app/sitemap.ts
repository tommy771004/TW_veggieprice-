import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/env'
import { COMMON_CROPS } from '@/lib/crops'

const CATEGORY_SLUGS = ['vegetable', 'fruit', 'mushroom', 'flower']

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,                lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/search`,    lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/seasonal`,  lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${base}/insights`,  lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
    { url: `${base}/watchlist`, lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/settings`,  lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) => ({
    url:             `${base}/produce/category/${slug}`,
    lastModified:    now,
    changeFrequency: 'daily' as const,
    priority:        0.7,
  }))

  const cropRoutes: MetadataRoute.Sitemap = COMMON_CROPS.map((crop) => ({
    url:             `${base}/produce/${encodeURIComponent(crop)}`,
    lastModified:    now,
    changeFrequency: 'daily' as const,
    priority:        0.8,
  }))

  return [...staticRoutes, ...categoryRoutes, ...cropRoutes]
}
