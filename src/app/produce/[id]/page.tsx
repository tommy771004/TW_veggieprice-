import type { Metadata } from 'next'
import Link from 'next/link'
import { ProduceClient } from '@/components/pages/ProduceClient'
import { ProduceFAQJsonLd, ProduceBreadcrumbJsonLd, ProduceDatasetJsonLd, ProduceProductJsonLd } from '@/components/seo/JsonLd'
import { ProduceFaqSection } from '@/components/seo/ProduceFaq'
import { SITE_URL } from '@/lib/env'
import { COMMON_CROPS } from '@/lib/crops'
import { getProduceCategory } from '@/lib/produce'
import { fetchMarketDataByDates } from '@/lib/server/moa'
import { subtractDays, todayISO } from '@/lib/server/dateUtils'

const CATEGORY_LABEL: Record<string, string> = {
  vegetable: '蔬菜類',
  fruit: '水果類',
  mushroom: '菇類',
  flower: '花卉類',
  meat: '肉類',
  seafood: '海鮮類',
}

type Props = { params: Promise<{ id: string }> }

export const revalidate = 3600

export async function generateStaticParams() {
  return COMMON_CROPS.map((crop) => ({
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

async function fetchInitialPrice(cropName: string): Promise<number> {
  try {
    const today = todayISO()
    const start = subtractDays(today, 7)
    const result = await fetchMarketDataByDates(cropName, '', start, today)
    if (result.error || !result.data.length) return 0
    const valid = result.data.filter((p) => p.avgPrice !== null)
    return valid[valid.length - 1]?.avgPrice ?? 0
  } catch {
    return 0
  }
}

export default async function ProducePage({ params }: Props) {
  const { id } = await params
  const cropName = decodeURIComponent(id)
  const pageUrl = `${SITE_URL}/produce/${id}`
  const initialPrice = await fetchInitialPrice(cropName)
  const category = getProduceCategory(cropName)
  const categoryLabel = CATEGORY_LABEL[category] ?? '作物'
  const hasCategoryHub = ['vegetable', 'fruit', 'mushroom', 'flower'].includes(category)

  return (
    <>
      <ProduceFAQJsonLd cropName={cropName} />
      <ProduceBreadcrumbJsonLd cropName={cropName} cropId={id} />
      <ProduceDatasetJsonLd cropName={cropName} url={pageUrl} />
      {initialPrice > 0 && (
        <ProduceProductJsonLd cropName={cropName} url={pageUrl} price={initialPrice} />
      )}
      <ProduceClient cropName={cropName} initialPrice={initialPrice} />
      <ProduceFaqSection cropName={cropName} />
      {hasCategoryHub && (
        <div className="px-section-margin pb-8">
          <Link
            href={`/produce/category/${category}`}
            className="inline-flex items-center gap-1.5 text-label-bold text-primary hover:underline"
          >
            ← 查看所有{categoryLabel}行情
          </Link>
        </div>
      )}
    </>
  )
}
