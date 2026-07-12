'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { m } from 'framer-motion'
import { CropIcon } from '@/components/ui/CropIcon'
import { getProduceCategory } from '@/lib/produce'
import type { SeasonalItem } from '@/lib/types'

type PlatePart = {
  id: 'vegetable' | 'fruit' | 'grain' | 'protein' | 'dairy' | 'nuts'
  label: string
  cue: string
  icon: string
}

const PLATE_PARTS: PlatePart[] = [
  { id: 'vegetable', label: '蔬菜', cue: '菜比水果多一點', icon: 'nutrition' },
  { id: 'fruit', label: '水果', cue: '每餐一個拳頭大', icon: 'emoji_food_beverage' },
  { id: 'grain', label: '全穀雜糧', cue: '和蔬菜一樣多', icon: 'grain' },
  { id: 'protein', label: '豆魚蛋肉', cue: '一個掌心', icon: 'set_meal' },
  { id: 'dairy', label: '乳品', cue: '每天早晚一杯', icon: 'local_cafe' },
  { id: 'nuts', label: '堅果種子', cue: '一茶匙', icon: 'spa' },
]

const FALLBACK_ITEMS: SeasonalItem[] = [
  { cropName: '高麗菜', emoji: '🥬', category: 'vegetable', reason: '當季蔬菜', note: '可作為一餐的蔬菜主角。' },
  { cropName: '地瓜', emoji: '🍠', category: 'vegetable', reason: '全穀雜糧替代', note: '可搭配主食增加變化。' },
  { cropName: '香蕉', emoji: '🍌', category: 'fruit', reason: '當季水果', note: '餐後搭配一份水果。' },
]

function pickRotating(items: SeasonalItem[], offset: number, count: number) {
  if (items.length === 0) return []

  return Array.from({ length: Math.min(count, items.length) }, (_, index) => {
    return items[(offset + index) % items.length]
  })
}

function buildBasket(items: SeasonalItem[], rotation: number) {
  const source = items.length > 0 ? items : FALLBACK_ITEMS
  const vegetables = source.filter((item) => getProduceCategory(item.cropName) === 'vegetable')
  const fruits = source.filter((item) => getProduceCategory(item.cropName) === 'fruit')
  const vegetableChoices = pickRotating(vegetables.length > 0 ? vegetables : source, rotation, 2)
  const fruitChoices = pickRotating(fruits.length > 0 ? fruits : source, rotation + 1, 1)

  return [
    ...vegetableChoices.map((item, index) => ({
      ...item,
      role: index === 0 ? '蔬菜主角' : '多一色蔬菜',
      tip: index === 0 ? '優先讓蔬菜的份量比水果多一些。' : '選不同顏色或口感，讓餐盤更多樣。',
    })),
    ...fruitChoices.map((item) => ({
      ...item,
      role: '餐後水果',
      tip: '以一份拳頭大小為概念，搭配正餐而非取代蔬菜。',
    })),
  ]
}

export function HealthyBasketPlanner({ items }: { items: SeasonalItem[] }) {
  const [rotation, setRotation] = useState(0)
  const [checked, setChecked] = useState<Record<PlatePart['id'], boolean>>({
    vegetable: false,
    fruit: false,
    grain: false,
    protein: false,
    dairy: false,
    nuts: false,
  })

  const basket = useMemo(() => buildBasket(items, rotation), [items, rotation])
  const completedCount = PLATE_PARTS.filter((part) => checked[part.id]).length

  return (
    <div className="space-y-5">
      <section className="healthy-basket-hero overflow-hidden rounded-3xl px-5 py-6 md:px-8 md:py-8">
        <div className="relative max-w-2xl">
          <p className="healthy-basket-eyebrow">TODAY&apos;S FOOD RHYTHM</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold text-white">一餐好菜籃</h1>
          <p className="mt-3 max-w-xl text-body-md leading-relaxed text-white/78">
            從本月盛產食材開始，幫家裡的一餐補上蔬果的顏色；再用我的餐盤檢查六大類是否到位。
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-label-sm text-white/62">
            <span className="material-symbols-outlined text-base" aria-hidden="true">info</span>
            一般飲食規劃工具，非個別醫療或營養治療建議。
          </p>
        </div>
      </section>

      <section className="section-shell" aria-labelledby="basket-heading">
        <div className="section-heading-row mb-4">
          <div>
            <p className="section-kicker">Seasonal basket</p>
            <h2 id="basket-heading" className="text-headline-md font-semibold text-on-surface mt-1">
              今天可以這樣買
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              依本月盛產清單輪替，點選食材即可查看今日批發行情。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRotation((current) => current + 1)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-label-bold text-primary transition-colors hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">refresh</span>
            換一組
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {basket.map((item, index) => (
            <m.div
              key={`${item.cropName}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: index * 0.05 }}
            >
              <Link
                href={`/produce/${encodeURIComponent(item.cropName)}`}
                className="healthy-basket-item block h-full rounded-2xl p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="healthy-basket-icon">
                    <CropIcon name={item.cropName} className="w-8 h-8" />
                  </div>
                  <span className="text-label-sm font-semibold text-primary">{item.role}</span>
                </div>
                <h3 className="mt-4 text-body-lg font-bold text-on-surface">{item.cropName}</h3>
                <p className="mt-1 text-body-sm leading-relaxed text-on-surface-variant">{item.tip}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-label-bold text-primary">
                  看今日行情
                  <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_forward</span>
                </span>
              </Link>
            </m.div>
          ))}
        </div>
      </section>

      <section className="section-shell" aria-labelledby="plate-check-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-4">
          <div>
            <p className="section-kicker">Plate check</p>
            <h2 id="plate-check-heading" className="text-headline-md font-semibold text-on-surface mt-1">
              這餐還差什麼？
            </h2>
          </div>
          <p className="text-body-sm font-semibold text-primary" aria-live="polite">
            已完成 {completedCount} / {PLATE_PARTS.length} 類
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PLATE_PARTS.map((part) => {
            const isChecked = checked[part.id]
            return (
              <button
                key={part.id}
                type="button"
                aria-pressed={isChecked}
                onClick={() => setChecked((current) => ({ ...current, [part.id]: !current[part.id] }))}
                className={`healthy-plate-check ${isChecked ? 'healthy-plate-check--done' : ''}`}
              >
                <span className="material-symbols-outlined text-2xl" aria-hidden="true">{isChecked ? 'check_circle' : part.icon}</span>
                <span className="min-w-0 text-left">
                  <span className="block text-body-md font-semibold">{part.label}</span>
                  <span className="block mt-1 text-label-sm leading-relaxed opacity-75">{part.cue}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant/45 bg-surface-container-low px-5 py-4">
        <p className="text-body-sm leading-relaxed text-on-surface-variant">
          餐盤份量與六大類食物概念依衛生福利部國民健康署「我的餐盤」整理。特殊飲食需求、慢性病、孕哺或兒童餐食，請以醫師或營養師的個別建議為準。
        </p>
        <a
          href="https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=1405&pid=8629&sid=10109"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-label-bold text-primary hover:underline"
        >
          查看國健署我的餐盤
          <span className="material-symbols-outlined text-base" aria-hidden="true">open_in_new</span>
        </a>
      </section>
    </div>
  )
}
