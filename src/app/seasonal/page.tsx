import type { Metadata } from 'next'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { getSeasonalGuide } from '@/lib/produce'
import { fetchSeasonalCrops } from '@/lib/server/moa'

// Revalidate every hour so the page reflects today's MOA data without always hitting the API
export const revalidate = 3600

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
              <div className="w-14 h-14 rounded-2xl bg-white/70 border border-white/60 flex items-center justify-center text-3xl flex-shrink-0">
                {item.emoji}
              </div>
              <div>
                <p className="text-body-lg font-semibold text-on-surface">{item.cropName}</p>
                <p className="text-body-sm text-primary-container mt-1">{item.reason}</p>
                <p className="text-body-sm text-on-surface-variant mt-2">{item.note}</p>
                <Link
                  href={`/search?q=${encodeURIComponent(item.cropName)}&type=${
                    item.category === 'fruit' ? 'Fruit' : item.category === 'flower' ? 'Flower' : 'Veg'
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
    </div>
  )
}