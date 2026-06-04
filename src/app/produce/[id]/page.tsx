import type { Metadata } from 'next'
import { ProduceClient } from '@/components/pages/ProduceClient'
import { BreadcrumbListJsonLd, ProduceDatasetJsonLd } from '@/components/seo/JsonLd'
import { ProduceFaqSection } from '@/components/seo/ProduceFaq'
import { SITE_URL } from '@/lib/env'

type Props = { params: Promise<{ id: string }> }

export const revalidate = 3600

export async function generateStaticParams() {
  // Pre-generate popular crops for SSG to reduce server load
  const popularCrops = ['高麗菜', '香蕉', '蒜頭', '洋蔥', '番茄', '西瓜', '青江菜', '地瓜葉', '蘋果', '玉米']
  return popularCrops.map((crop) => ({
    id: encodeURIComponent(crop),
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const cropName = decodeURIComponent(id)
  const pageUrl = `${SITE_URL}/produce/${id}`
  return {
    title: `${cropName} 今日批發價與歷史走勢 | 農時價`,
    description: `即時查詢${cropName}全台批發市場均價、漲跌幅與歷史價格走勢圖表，助您避免買貴。`,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${cropName} 批發行情 | 農時價`,
      description: `${cropName}今日均價、歷史走勢與全台市場比價。`,
      url: pageUrl,
      images: ['/api/og'],
    },
  }
}

export default async function ProducePage({ params }: Props) {
  const { id } = await params
  const cropName = decodeURIComponent(id)
  const pageUrl = `${SITE_URL}/produce/${id}`
  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: '首頁', url: SITE_URL },
          { name: `${cropName} 批發行情`, url: pageUrl },
        ]}
      />
      <ProduceDatasetJsonLd cropName={cropName} url={pageUrl} />
      <ProduceClient cropName={cropName} />
      <ProduceFaqSection cropName={cropName} />
    </>
  )
}
