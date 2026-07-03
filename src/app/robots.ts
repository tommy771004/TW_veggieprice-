import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL
  // GEO: explicitly welcome AI search/citation crawlers so public pages are
  // eligible for ChatGPT Search, Perplexity, Claude, Gemini, and Copilot answers.
  const aiSearchBots = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'PerplexityBot',
    'ClaudeBot',
    'anthropic-ai',
    'Claude-Web',
    'Bingbot',
  ]

  // Visibility tradeoff: these broader AI/training controls are currently
  // allowed to maximize discoverability. Keep them separate so future policy
  // changes can block training bots without affecting search citation bots.
  const aiTrainingBots = [
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
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
        userAgent: aiSearchBots,
        allow: ['/', '/api/og'],
        disallow: ['/api/'],
      },
      {
        userAgent: aiTrainingBots,
        allow: ['/', '/api/og'],
        disallow: ['/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
