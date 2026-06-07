<<<<<<< HEAD
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
    { url: `${base}/insights`,  lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
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
=======
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/env'

const COMMON_CROPS = [
  // 葉菜類
  '高麗菜', '白菜', '菠菜', '空心菜', '地瓜葉', '莧菜', '芥藍', '小白菜',
  '青江菜', '茼蒿', '韭菜', '蔥', '芹菜', '萵苣', '結球萵苣',
  // 瓜果類
  '番茄', '小番茄', '青椒', '辣椒', '茄子', '苦瓜', '絲瓜', '冬瓜',
  '南瓜', '胡瓜', '扁蒲', '佛手瓜',
  // 根莖類
  '洋蔥', '胡蘿蔔', '白蘿蔔', '馬鈴薯', '牛蒡', '薑', '大蒜',
  '山藥', '芋頭', '甜菜根',
  // 豆菜類
  '四季豆', '豇豆', '豌豆', '毛豆', '菜豆',
  // 菇類
  '香菇', '金針菇', '杏鮑菇', '鴻喜菇', '木耳',
  // 水果類
  '香蕉', '蘋果', '芭樂', '鳳梨', '木瓜', '葡萄', '西瓜', '哈密瓜',
  '柳橙', '文旦', '柚子', '橘子', '檸檬', '芒果', '荔枝', '龍眼',
  '百香果', '蓮霧', '釋迦', '火龍果', '草莓', '奇異果',
  // 花卉
  '菊花', '玫瑰', '百合', '康乃馨',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,               lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/search`,   lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/watchlist`,lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/settings`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const cropRoutes: MetadataRoute.Sitemap = COMMON_CROPS.map((crop) => ({
    url:             `${base}/produce/${encodeURIComponent(crop)}`,
    lastModified:    now,
    changeFrequency: 'daily' as const,
    priority:        0.8,
  }))

  return [...staticRoutes, ...cropRoutes]
}
>>>>>>> 9415576 (feat: add Google Search Console verification, SEO/GEO schema improvements, and XSS fix)
