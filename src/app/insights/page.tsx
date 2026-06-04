import type { Metadata } from 'next'
import { InsightsClient } from '@/components/pages/InsightsClient'
import { SITE_URL } from '@/lib/env'

export const metadata: Metadata = {
  title: '市場洞察與休市日查詢 | 農時價',
  description: '掌握台灣各大批發市場休市日與市場動態，提前規劃採買，避開無交易日落空查價。',
  alternates: { canonical: `${SITE_URL}/insights` },
  openGraph: {
    title: '市場洞察與休市日查詢 | 農時價',
    description: '查詢全台批發市場休市日與進階市場數據，採買規劃更精準。',
    url: `${SITE_URL}/insights`,
    images: ['/api/og'],
  },
}

export default function InsightsPage() {
  return <InsightsClient />
}
