import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/env'

const COMMON_CROPS = [
  '高麗菜', '番茄', '洋蔥', '胡蘿蔔', '青椒', '花椰菜',
  '香蕉', '蘋果', '芭樂', '鳳梨', '木瓜', '葡萄',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,                lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/search`,    lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/seasonal`,  lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${base}/watchlist`, lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/settings`,  lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const cropRoutes: MetadataRoute.Sitemap = COMMON_CROPS.map((crop) => ({
    url:             `${base}/produce/${encodeURIComponent(crop)}`,
    lastModified:    now,
    changeFrequency: 'daily' as const,
    priority:        0.8,
  }))

  return [...staticRoutes, ...cropRoutes]
}
