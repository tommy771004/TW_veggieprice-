import type { Metadata } from 'next'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { CropIcon } from '@/components/ui/CropIcon'
import { FaqSection, type FaqItem } from '@/components/seo/FaqSection'
import { ItemListJsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/env'
import { getSeasonalGuide } from '@/lib/produce'
import { fetchSeasonalCrops } from '@/lib/server/moa'

// Revalidate every hour so the page reflects today's MOA data without always hitting the API
export const revalidate = 3600

// Category hubs that exist under /produce/category/[category].
const CATEGORY_LINKS = [
  { value: 'vegetable', label: '蔬菜類', emoji: '🥬' },
  { value: 'fruit', label: '水果類', emoji: '🍎' },
  { value: 'mushroom', label: '菇類', emoji: '🍄' },
  { value: 'flower', label: '花卉類', emoji: '🌸' },
] as const

const SEASONAL_FAQ_ITEMS: FaqItem[] = [
  {
    q: '當季盛產蔬果一定比較便宜嗎？',
    a: '不一定，但機率較高。當季蔬果通常供應較穩定，若今日批發均價低於近月平均，通常代表採買成本較有利；仍需搭配交易量、天氣與市場休市日判斷。',
  },
  {
    q: '當季指南和今日菜價有什麼差別？',
    a: '當季指南說明本月較常見、供應較穩定的作物；今日菜價則是批發市場實際成交均價。採買前建議先看當季清單，再進入單品頁確認當日均價與歷史走勢。',
  },
  {
    q: '如果當季作物今天價格偏高怎麼辦？',
    a: '可改查同類別其他作物，或比較不同批發市場的均價。若價格偏高且交易量偏低，可能代表短期供應吃緊，採買時可考慮替代蔬果。',
  },
]

export const metadata: Metadata = {
  title: '當季盛產指南 | 農時價',
  description: '依月份推薦台灣當季盛產蔬果，快速找到目前 CP 值較高、供應穩定的採買選項。',
  alternates: { canonical: `${SITE_URL}/seasonal` },
  openGraph: {
    title: '當季盛產指南 | 農時價',
    description: '依月份推薦台灣當季盛產蔬果，搭配今日批發價與歷史走勢判斷採買時機。',
    url: `${SITE_URL}/seasonal`,
    images: ['/api/og'],
  },
}

export default async function SeasonalPage() {
  const monthLabel = new Intl.DateTimeFormat('zh-TW', { month: 'long' }).format(new Date())
  const { crops } = await fetchSeasonalCrops()
  const items = crops.length > 0 ? crops : getSeasonalGuide()

  return (
    <>
      <ItemListJsonLd
        name={`${monthLabel}台灣當季盛產蔬果`}
        description="依月份整理供應較穩定、適合搭配批發行情判斷採買時機的台灣蔬果。"
        url={`${SITE_URL}/seasonal`}
        items={items.map((item) => ({
          name: item.cropName,
          url: `${SITE_URL}/produce/${encodeURIComponent(item.cropName)}`,
          description: `${item.reason} ${item.note}`,
        }))}
      />
      <div className="px-section-margin py-6 max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">當季盛產指南</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            {monthLabel} 推薦採買清單，從產季、供應穩定度與今日批發價切入。
          </p>
        </div>

        <section className="section-shell space-y-3">
          <p className="section-kicker">Seasonal guide</p>
          <h2 className="text-headline-md font-semibold text-on-surface">
            如何用當季清單判斷採買時機？
          </h2>
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            當季盛產蔬果通常供應較穩定，但仍需搭配今日批發均價判斷是否划算。若單品頁顯示今日均價低於近月平均，且交易量維持穩定，通常就是較適合採買的時段。
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <GlassCard key={item.cropName} className="p-container-padding rounded-3xl">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/70 border border-white/60 flex items-center justify-center flex-shrink-0">
                  <CropIcon name={item.cropName} className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-body-lg font-semibold text-on-surface">{item.cropName}</p>
                  <p className="text-body-sm text-primary-container mt-1">{item.reason}</p>
                  <p className="text-body-sm text-on-surface-variant mt-2">{item.note}</p>
                  <Link
                    href={`/produce/${encodeURIComponent(item.cropName)}`}
                    className="inline-block mt-3 text-primary text-label-bold hover:underline"
                  >
                    查看行情
                  </Link>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <section className="pt-2 space-y-3">
          <h2 className="text-headline-md font-semibold text-on-surface">依分類探索更多行情</h2>
          <p className="text-body-sm text-on-surface-variant">當季清單之外，也可以直接從整個類別切入比價。</p>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORY_LINKS.map((cat) => (
              <li key={cat.value}>
                <Link
                  href={`/produce/category/${cat.value}`}
                  className="glass-card rounded-2xl px-4 py-4 flex flex-col gap-1 hover:bg-white/75 transition-colors h-full"
                >
                  <span className="text-2xl leading-none" aria-hidden="true">{cat.emoji}</span>
                  <span className="text-body-md font-semibold text-on-surface mt-1">{cat.label}</span>
                  <span className="text-label-sm text-on-surface-variant">查看整類行情 →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <FaqSection heading="當季盛產蔬果常見問題" items={SEASONAL_FAQ_ITEMS} url={`${SITE_URL}/seasonal`} />
    </>
  )
}
