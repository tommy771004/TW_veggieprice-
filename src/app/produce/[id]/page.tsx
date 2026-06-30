import type { Metadata } from 'next'
import Link from 'next/link'
import { ProduceClient } from '@/components/pages/ProduceClient'
import { ProduceFAQJsonLd, ProduceBreadcrumbJsonLd, ProduceDatasetJsonLd, ProduceProductJsonLd } from '@/components/seo/JsonLd'
import { ProduceFaqSection } from '@/components/seo/ProduceFaq'
import { ProduceMarketSummary } from '@/components/seo/ProduceMarketSummary'
import { SITE_URL } from '@/lib/env'
import { getProduceCategory } from '@/lib/produce'
import { fetchMarketDataByDates, type HistoryPoint } from '@/lib/server/moa'
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

// The dynamic segment is a URL-encoded CJK crop name. A cacheable (ISR/static)
// route makes Next.js attach an implicit path-based cache tag —
// `_N_T_/produce/<decoded-name>` — to the `x-next-cache-tags` response header.
// HTTP header values must be latin-1, so the raw Chinese characters throw
// `ERR_INVALID_CHAR`. Rendering dynamically drops that path tag; MOA responses
// are still cached at the data layer via `unstable_cache` in src/lib/server/moa.ts.
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

// One server-side history fetch feeds both the client hero (initial price) and
// the crawlable ProduceMarketSummary, so we don't double-fetch MOA per build.
async function fetchRecentHistory(cropName: string): Promise<HistoryPoint[]> {
  try {
    const today = todayISO()
    const start = subtractDays(today, 30)
    const result = await fetchMarketDataByDates(cropName, '', start, today)
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
      {initialPrice > 0 && (
        <ProduceProductJsonLd cropName={cropName} url={pageUrl} price={initialPrice} />
      )}
      <ProduceClient cropName={cropName} initialPrice={initialPrice} />
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
