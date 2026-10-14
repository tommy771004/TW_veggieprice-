import type { Metadata } from 'next'
import { HomeClient } from '@/components/pages/HomeClient'
import { HomeGeoCitationSection } from '@/components/seo/GeoCitationSection'
import { HomeFaqSection } from '@/components/seo/HomeFaq'
import { HomeSeoLinks } from '@/components/seo/HomeSeoLinks'
import { prefetchDefaultHomeData } from '@/lib/server/home-prefetch'
import { SITE_URL } from '@/lib/env'

export const revalidate = 60 // ISR: HTML + embedded default shell refresh every 60s

export const metadata: Metadata = {
  // Lead with 今日菜價查詢 (best-CTR query); 菜價 / 蔬果行情 / 蔬菜批發價格 rank
  // 6–10 on the homepage but sat under 1% CTR without the words in the title.
  title: '今日菜價查詢｜台灣蔬果行情與蔬菜批發價格 | 農時價',
  description: '今日菜價即時查詢：全台果菜批發市場蔬菜、水果每日行情與批發價格，含漲跌幅、歷史走勢與台北、台中、西螺等各市場比價，每日依農業部資料更新。',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: '農時價 — 台灣蔬果批發行情即時查詢',
    description: '免費查詢全台批發市場今日菜價，支援歷史走勢圖表與各市場比價。',
    url: SITE_URL,
    images: ['/api/og'],
  },
}

/**
 * ADR-0001 option D (F6 phase): prefetch National Overview + week trend
 * into the RSC payload so first paint can show real numbers.
 * CDN still serves STALE HTML quickly (revalidate=60); regeneration may wait on MOA.
 * F5 request fan-out is deferred until post-deploy re-measure.
 */
export default async function DashboardPage() {
  const { overview, trend, livestock } = await prefetchDefaultHomeData()

  return (
    <>
      <HomeClient
        initialTrend={trend}
        initialLivestock={livestock}
        initialOverview={overview}
      />
      <HomeSeoLinks />
      <HomeGeoCitationSection />
      <HomeFaqSection />
    </>
  )
}
