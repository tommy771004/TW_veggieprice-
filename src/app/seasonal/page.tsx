import type { Metadata } from 'next'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { CropIcon } from '@/components/ui/CropIcon'
import { getSeasonalGuide } from '@/lib/produce'
import { fetchSeasonalCrops } from '@/lib/server/moa'

// Revalidate every hour so the page reflects today's MOA data without always hitting the API
export const revalidate = 3600

// Category hubs that exist under /produce/category/[category].
const CATEGORY_LINKS = [
  { value: 'vegetable', label: '蔬菜類', emoji: '🥬' },
  { value: 'fruit', label: '水果類', emoji: '🍎' },
  { value: 'mushroom', label: '菇類', emoji: '🍄' },
] as const

export const metadata: Metadata = {
  title: '當季盛產指南 | 農時價',
  description: '依月份推薦台灣當季盛產蔬果，快速找到目前 CP 值較高、供應穩定的採買選項。',
}

export default async function SeasonalPage() {
  const monthLabel = new Intl.DateTimeFormat('zh-TW', { month: 'long' }).format(new Date())
  const { crops } = await fetchSeasonalCrops()
  const items = crops.length > 0 ? crops : getSeasonalGuide()

  return (
    <div className="px-section-margin py-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-headline-lg font-bold text-on-surface">當季盛產指南</h1>
        <p className="text-body-md text-on-surface-variant mt-1">{monthLabel} 推薦採買清單，從產季與供應穩定度切入。</p>
      </div>

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
                  href={`/search?q=${encodeURIComponent(item.cropName)}&type=${
                    item.category === 'fruit' ? 'Fruit' : 'Veg'
                  }`}
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
  )
}