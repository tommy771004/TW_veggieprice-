import type { Metadata } from 'next'
import Link from 'next/link'
import { ProduceClient } from '@/components/pages/ProduceClient'
import { ProduceFAQJsonLd, ProduceBreadcrumbJsonLd, ProduceDatasetJsonLd } from '@/components/seo/JsonLd'
import { ProduceFaqSection } from '@/components/seo/ProduceFaq'
import { ProduceMarketSummary } from '@/components/seo/ProduceMarketSummary'
import { FoodGuideSection } from '@/components/produce/FoodGuideSection'
import { GovernmentDataSection } from '@/components/produce/GovernmentDataSection'
import { SITE_URL } from '@/lib/env'
import { getProduceCategory } from '@/lib/produce'
import { getCropBaseInfo } from '@/lib/cropInfo'
import { fetchLocalMarketDataByDates, type HistoryPoint } from '@/lib/server/moa'
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

export const dynamic = 'force-dynamic'

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

async function fetchRecentHistory(cropName: string): Promise<HistoryPoint[]> {
  try {
    const today = todayISO()
    const start = subtractDays(today, 30)
    const result = await fetchLocalMarketDataByDates(cropName, '', start, today)
    if (result.error) return []
    return result.data
  } catch {
    return []
  }
}

export default async function ProducePage({ params }: Props) {
  const { id } = await params
  const cropName = decodeURIComponent(id)
  const pageUrl = `${SITE_URL}/produce/${id}`
  const history = await fetchRecentHistory(cropName)
  const baseInfo = getCropBaseInfo(cropName)
  const initialPrice =
    history.filter((p) => p.avgPrice !== null && p.avgPrice > 0).slice(-1)[0]?.avgPrice ?? 0
  const category = getProduceCategory(cropName)
  const categoryLabel = CATEGORY_LABEL[category] ?? '作物'
  const hasCategoryHub = ['vegetable', 'fruit', 'mushroom', 'flower'].includes(category)

  return (
    <>
      <ProduceFAQJsonLd cropName={cropName} />
      <ProduceBreadcrumbJsonLd cropName={cropName} cropId={id} />
      <ProduceDatasetJsonLd cropName={cropName} url={pageUrl} />
      <ProduceClient
        cropName={cropName}
        initialPrice={initialPrice}
        initialCropInfo={
          baseInfo
            ? {
                feature: baseInfo.feature,
                season: baseInfo.season,
                origin: baseInfo.staticOrigin,
              }
            : null
        }
      />
      <FoodGuideSection cropName={cropName} />
      <GovernmentDataSection cropName={cropName} wholesalePrice={initialPrice} />
      <ProduceMarketSummary cropName={cropName} history={history} />
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
