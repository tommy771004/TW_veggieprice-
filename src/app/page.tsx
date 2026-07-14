import type { Metadata } from 'next'
import { HomeClient } from '@/components/pages/HomeClient'
import { HomeGeoCitationSection } from '@/components/seo/GeoCitationSection'
import { HomeFaqSection } from '@/components/seo/HomeFaq'
import { HomeSeoLinks } from '@/components/seo/HomeSeoLinks'
import { prefetchDefaultHomeData } from '@/lib/server/home-prefetch'

export const revalidate = 60 // ISR: HTML + embedded default shell refresh every 60s

export const metadata: Metadata = {
  title: '今日台灣蔬果批發行情 | 農時價',
  description: '即時掌握台北、台中等全台批發市場蔬菜、水果最新行情，免費查詢今日菜價與歷史漲跌趨勢。',
  openGraph: {
    title: '農時價 — 台灣蔬果批發行情即時查詢',
    description: '免費查詢全台批發市場今日菜價，支援歷史走勢圖表與各市場比價。',
    images: ['/api/og'],
  },
}

/**
 * ADR-0001 option D (F6 phase): prefetch default market overview + week trend
 * into the RSC payload so first paint can show real numbers.
 * CDN still serves STALE HTML quickly (revalidate=60); regeneration may wait on MOA.
 * F5 request fan-out is deferred until post-deploy re-measure.
 */
export default async function DashboardPage() {
  const { overview, trend } = await prefetchDefaultHomeData()

  return (
    <>
      <HomeClient
        initialTrend={trend}
        initialLivestock={null}
        initialOverview={overview}
      />
      <HomeSeoLinks />
      <HomeGeoCitationSection />
      <HomeFaqSection />
    </>
  )
}
