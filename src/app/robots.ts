import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL
  // GEO: explicitly welcome AI search crawlers so the site is eligible for citations
  // in ChatGPT Search, Perplexity, Claude, Gemini, and Copilot answers.
  const aiBots = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'PerplexityBot',
    'ClaudeBot',
    'anthropic-ai',
    'Claude-Web',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
    'Bingbot',
  ]
  return {
    rules: [
      {
        userAgent: '*',
        // Allow the dynamic OG image endpoint so social/image crawlers can fetch it;
        // longest-match wins, so /api/og stays crawlable while the rest of /api/ is blocked.
        allow: ['/', '/api/og'],
        disallow: ['/api/'],
      },
      {
        userAgent: aiBots,
        allow: ['/', '/api/og'],
        disallow: ['/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
