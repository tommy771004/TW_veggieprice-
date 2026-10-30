import type { Metadata } from 'next'
import Link from 'next/link'
import { cache } from 'react'
import { ProduceClient } from '@/components/pages/ProduceClient'
import { ProduceBreadcrumbJsonLd, ProduceDatasetJsonLd } from '@/components/seo/JsonLd'
import { ProduceFaqSection } from '@/components/seo/ProduceFaq'
import { ProduceMarketSummary } from '@/components/seo/ProduceMarketSummary'
import { RelatedProduceLinks } from '@/components/seo/RelatedProduceLinks'
import { FoodGuideSection } from '@/components/produce/FoodGuideSection'
import { GovernmentDataSection } from '@/components/produce/GovernmentDataSection'
import { SITE_URL } from '@/lib/env'
import { getCropAliases, getCropBaseInfo, isCatalogPrimaryName } from '@/lib/cropInfo'
import { COMMON_CROPS } from '@/lib/crops'
import { buildProduceMeta } from '@/lib/produceSeo'
import { fetchLocalMarketDataByDates, resolveCropCategory, type HistoryPoint } from '@/lib/server/moa'
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

// Data only changes when the daily sync commit redeploys (which also purges
// this cache), so render each crop on first visit and serve it from the CDN.
export const revalidate = 3600

export function generateStaticParams() {
  return []
}

// Any string is a valid [id], so an unknown name with no trades would otherwise
// render an indexable, fill-in-the-blank page. Only index crops we know or that
// actually traded in the last 30 days; the rest stay reachable but noindex.
function isIndexableCrop(cropName: string, history: HistoryPoint[]): boolean {
  if ((COMMON_CROPS as readonly string[]).includes(cropName)) return true
  if (getCropBaseInfo(cropName)) return true
  return history.some((p) => p.avgPrice !== null && p.avgPrice > 0)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const cropName = decodeURIComponent(id)
  const pageUrl = `${SITE_URL}/produce/${id}`
  const history = await fetchRecentHistory(cropName)
  const { title, description } = buildProduceMeta({
    cropName,
    history,
    aliases: getCropAliases(cropName),
    aliasInTitle: isCatalogPrimaryName(cropName),
    today: todayISO(),
  })
  return {
    ...(!isIndexableCrop(cropName, history) && { robots: { index: false, follow: true } }),
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${cropName} 批發行情 | 農時價`,
      description: `${cropName}今日均價、近30日歷史走勢與全台市場比價，資料來源農業部。`,
      url: pageUrl,
      images: ['/api/og'],
    },
  }
}

// cache(): generateMetadata and the page share one read per request.
const fetchRecentHistory = cache(async (cropName: string): Promise<HistoryPoint[]> => {
  try {
    const today = todayISO()
    const start = subtractDays(today, 30)
    const result = await fetchLocalMarketDataByDates(cropName, '', start, today)
    if (result.error) return []
    return result.data
  } catch {
    return []
  }
})

export default async function ProducePage({ params }: Props) {
  const { id } = await params
  const cropName = decodeURIComponent(id)
  const pageUrl = `${SITE_URL}/produce/${id}`
  const history = await fetchRecentHistory(cropName)
  const baseInfo = getCropBaseInfo(cropName)
  const initialPrice =
    history.filter((p) => p.avgPrice !== null && p.avgPrice > 0).slice(-1)[0]?.avgPrice ?? 0
  // Resolve via MOA 種類代碼 so flower crops (康乃馨, 洋桔梗…) classify correctly.
  const category = await resolveCropCategory(cropName)
  const categoryLabel = CATEGORY_LABEL[category] ?? '作物'
  const hasCategoryHub = ['vegetable', 'fruit', 'mushroom', 'flower'].includes(category)

  return (
    <>
      <ProduceBreadcrumbJsonLd cropName={cropName} cropId={id} />
      <ProduceDatasetJsonLd cropName={cropName} url={pageUrl} />
      <ProduceClient
        cropName={cropName}
        category={category}
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
      <RelatedProduceLinks cropName={cropName} categoryLabel={categoryLabel} />
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
