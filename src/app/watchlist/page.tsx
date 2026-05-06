import type { Metadata } from 'next'
import { WatchlistClient } from '@/components/pages/WatchlistClient'

export const metadata: Metadata = {
  title: '我的觀察名單 | 農時價',
  description: '查看您收藏的農產品即時行情，一鍵掌握常買蔬果最新批發價格動態與漲跌趨勢。',
  openGraph: {
    title: '我的蔬果觀察名單 | 農時價',
    description: '一鍵追蹤常買蔬果的最新批發行情。',
  },
}

export default function WatchlistPage() {
  return <WatchlistClient />
}
