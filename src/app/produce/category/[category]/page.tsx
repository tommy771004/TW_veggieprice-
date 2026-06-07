import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SITE_URL } from '@/lib/env'
import { COMMON_CROPS } from '@/lib/crops'
import { getProduceCategory, type ProduceCategory } from '@/lib/produce'
import { BreadcrumbListJsonLd } from '@/components/seo/JsonLd'

type Props = { params: Promise<{ category: string }> }

const CATEGORY_META: Record<string, { label: string; description: string; keywords: string[] }> = {
  vegetable: {
    label: '蔬菜類',
    description: '台灣全台批發市場蔬菜類農產品今日批發均價、漲跌幅與歷史走勢，資料來源農業部，每日更新。',
    keywords: ['蔬菜批發價', '台灣菜價', '今日蔬菜行情', '葉菜批發', '根莖類菜價'],
  },
  fruit: {
    label: '水果類',
    description: '台灣全台批發市場水果類農產品今日批發均價、漲跌幅與歷史走勢，資料來源農業部，每日更新。',
    keywords: ['水果批發價', '台灣水果行情', '今日水果菜價', '水果批發市場'],
  },
  mushroom: {
    label: '菇類',
    description: '台灣全台批發市場菇類農產品今日批發均價、漲跌幅與歷史走勢，資料來源農業部，每日更新。',
    keywords: ['菇類批發價', '香菇批發行情', '台灣菇類菜價'],
  },
  flower: {
    label: '花卉類',
    description: '台灣全台批發市場花卉類農產品今日批發均價、漲跌幅與歷史走勢，資料來源農業部，每日更新。',
    keywords: ['花卉批發價', '台灣花卉行情', '切花批發市場'],
  },
}

const VALID_CATEGORIES = Object.keys(CATEGORY_META) as ProduceCategory[]

export async function generateStaticParams() {
  return VALID_CATEGORIES.map((category) => ({ category }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const meta = CATEGORY_META[category]
  if (!meta) return {}
  const pageUrl = `${SITE_URL}/produce/category/${category}`
  return {
    title: `${meta.label}批發行情總覽 | 農時價`,
    description: meta.description,
    keywords: meta.keywords,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${meta.label}批發行情總覽 | 農時價`,
      description: meta.description,
      url: pageUrl,
    },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  const meta = CATEGORY_META[category]
  if (!meta) notFound()

  const cropsInCategory = COMMON_CROPS.filter(
    (crop) => getProduceCategory(crop) === (category as ProduceCategory)
  )

  const pageUrl = `${SITE_URL}/produce/category/${category}`

  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: '首頁', url: SITE_URL },
          { name: `${meta.label}批發行情`, url: pageUrl },
        ]}
      />
      <div className="home-dashboard-shell pb-8">
        <div className="px-section-margin py-6 space-y-6">
          <div>
            <p className="section-kicker">Category hub</p>
            <h1 className="text-headline-lg font-black text-on-surface">{meta.label}批發行情總覽</h1>
            <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl">{meta.description}</p>
          </div>

          <nav aria-label={`${meta.label}作物列表`}>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {cropsInCategory.map((crop) => (
                <li key={crop}>
                  <Link
                    href={`/produce/${encodeURIComponent(crop)}`}
                    className="glass-card rounded-2xl px-4 py-3 flex flex-col gap-1 hover:bg-white/75 transition-colors block"
                  >
                    <span className="text-body-md font-semibold text-on-surface">{crop}</span>
                    <span className="text-label-sm text-on-surface-variant">查看行情 →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="section-shell">
            <h2 className="text-headline-md font-semibold text-on-surface mb-3">其他類別</h2>
            <ul className="flex flex-wrap gap-2">
              {VALID_CATEGORIES.filter((c) => c !== category).map((c) => (
                <li key={c}>
                  <Link
                    href={`/produce/category/${c}`}
                    className="market-status-chip hover:bg-surface-container-high transition-colors"
                  >
                    {CATEGORY_META[c].label}行情
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
