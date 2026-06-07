import type { Metadata } from 'next'
import { ProduceClient } from '@/components/pages/ProduceClient'
import { ProduceFAQJsonLd, ProduceBreadcrumbJsonLd, ProduceDatasetJsonLd } from '@/components/seo/JsonLd'
import { ProduceFaqSection } from '@/components/seo/ProduceFaq'
import { SITE_URL } from '@/lib/env'

type Props = { params: Promise<{ id: string }> }

export const revalidate = 3600

export async function generateStaticParams() {
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
    description: `即時查詢${cropName}全台超過20個批發市場均價、漲跌幅與近30日歷史價格走勢，每日更新農業部官方數據，助您掌握最佳採購時機。`,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${cropName} 批發行情 | 農時價`,
      description: `${cropName}今日均價、近30日歷史走勢與全台市場比價，資料來源農業部。`,
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
      <ProduceFAQJsonLd cropName={cropName} />
      <ProduceBreadcrumbJsonLd cropName={cropName} cropId={id} />
      <ProduceDatasetJsonLd cropName={cropName} url={pageUrl} />
      <ProduceClient cropName={cropName} />
      <ProduceFaqSection cropName={cropName} />
    </>
  )
}
