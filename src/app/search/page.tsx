import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SearchContent } from '@/components/pages/SearchContent'
import { SearchSeoSummary } from '@/components/seo/SearchSeoSummary'
import { SkeletonList } from '@/components/ui/SkeletonCard'

export const revalidate = 300


export const metadata: Metadata = {
  title: '搜尋農產品批發價格 | 農時價',
  description: '搜尋並篩選全台各大批發市場蔬果行情，支援市場、日期區間、價格區間多維度篩選，快速比對今日菜價。',
  openGraph: {
    title: '農產品批發價格搜尋 | 農時價',
    description: '搜尋全台批發市場今日蔬果行情，多維度篩選與排序。',
    images: ['/api/og'],
  },
}

export default function SearchPage() {
  return (
    <>
      <Suspense fallback={<SkeletonList count={6} />}>
        <SearchContent />
      </Suspense>
      <SearchSeoSummary />
    </>
  )
}
