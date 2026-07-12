import type { Metadata } from 'next'
import { HealthyBasketPlanner } from '@/components/pages/HealthyBasketPlanner'
import { FaqSection, type FaqItem } from '@/components/seo/FaqSection'
import { HowToJsonLd, WebPageJsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/env'
import { getSeasonalGuide } from '@/lib/produce'
import { fetchSeasonalCrops } from '@/lib/server/moa'

export const revalidate = 3600

const SEASONAL_DATA_TIMEOUT_MS = 1500

async function getHealthyBasketItems() {
  const fallback = getSeasonalGuide()

  const result = await Promise.race([
    fetchSeasonalCrops(),
    new Promise<undefined>((resolve) => {
      setTimeout(() => resolve(undefined), SEASONAL_DATA_TIMEOUT_MS)
    }),
  ])

  return result?.crops.length ? result.crops : fallback
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: '一餐好菜籃如何選出食材？',
    a: '工具會優先使用本月農產品交易資料中的盛產品項；資料暫時無法取得時，才改用內建的當季指南。食材頁可再查看今日批發均價與歷史走勢。',
  },
  {
    q: '菜籃中的食材能取代完整的一餐嗎？',
    a: '不能。頁面用國健署我的餐盤六大類食物協助檢查一餐完整度，除了蔬菜與水果，也需依個人需求搭配全穀雜糧、豆魚蛋肉、乳品與堅果種子。',
  },
  {
    q: '有慢性病或特殊飲食需求，可以直接照著吃嗎？',
    a: '不建議直接作為個別飲食處方。腎臟病、糖尿病、食物過敏、孕哺與兒童等情況，應優先遵循醫師或營養師的個別建議。',
  },
]

export const metadata: Metadata = {
  title: '一餐好菜籃 | 當季食材與我的餐盤檢查',
  description: '把台灣當季盛產食材轉成一餐採買靈感，並用國健署我的餐盤六大類食物檢查餐點完整度。',
  alternates: { canonical: `${SITE_URL}/healthy-basket` },
  openGraph: {
    title: '一餐好菜籃 | 農時價',
    description: '從當季盛產食材開始，快速規劃一餐蔬果搭配並檢查我的餐盤六大類食物。',
    url: `${SITE_URL}/healthy-basket`,
    images: ['/api/og'],
  },
}

export default async function HealthyBasketPage() {
  const items = await getHealthyBasketItems()

  return (
    <>
      <WebPageJsonLd
        name="一餐好菜籃｜農時價"
        description="結合台灣當季蔬果與國健署我的餐盤，協助家庭規劃一餐採買清單。"
        url={`${SITE_URL}/healthy-basket`}
        keywords={['當季蔬果', '我的餐盤', '健康飲食', '買菜清單']}
      />
      <HowToJsonLd
        name="使用一餐好菜籃規劃採買"
        description="以當季蔬果為起點，搭配我的餐盤六大類食物檢查一餐完整度。"
        steps={[
          '查看本月盛產食材，選擇一至兩種蔬菜與一種水果。',
          '點選食材進入行情頁，確認今日批發價與近期走勢。',
          '依我的餐盤檢查全穀雜糧、蛋白質、乳品與堅果種子是否有搭配。',
        ]}
      />
      <main className="px-section-margin py-6 max-w-4xl mx-auto">
        <HealthyBasketPlanner items={items} />
      </main>
      <FaqSection heading="一餐好菜籃常見問題" items={FAQ_ITEMS} url={`${SITE_URL}/healthy-basket`} />
    </>
  )
}
