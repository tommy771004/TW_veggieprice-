import type { Metadata } from 'next'
import { HomeClient } from '@/components/pages/HomeClient'

export const metadata: Metadata = {
  title: '今日台灣蔬果批發行情 | 農時價',
  description: '即時掌握台北、台中等全台批發市場蔬菜、水果最新行情，免費查詢今日菜價與歷史漲跌趨勢。',
  openGraph: {
    title: '農時價 — 台灣蔬果批發行情即時查詢',
    description: '免費查詢全台批發市場今日菜價，支援歷史走勢圖表與各市場比價。',
  },
}

export default function DashboardPage() {
  return <HomeClient />
}
