'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { m } from 'framer-motion'
import { fetchSeasonal } from '@/lib/api'
import { getSeasonalGuide } from '@/lib/produce'
import { CropIcon } from '@/components/ui/CropIcon'
import type { SeasonalItem } from '@/lib/types'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 28 },
  },
}

export function SeasonalGuideSection() {
  const [seasonalGuide, setSeasonalGuide] = useState<SeasonalItem[]>([])
  const [loadingSeasonal, setLoadingSeasonal] = useState(true)

  useEffect(() => {
    fetchSeasonal()
      .then((data) => setSeasonalGuide(data.length > 0 ? data : getSeasonalGuide()))
      .catch(() => setSeasonalGuide(getSeasonalGuide()))
      .finally(() => setLoadingSeasonal(false))
  }, [])

  return (
    <m.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-30px' }}
    >
      <div className="mt-8 mb-4">
        <div className="flex items-center gap-2 mb-4 px-2">
          <span className="material-symbols-outlined text-primary">local_florist</span>
          <h3 className="text-headline-md font-semibold text-on-surface">當季盛產指南</h3>
        </div>
        <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-4 snap-x snap-mandatory hide-scrollbar gap-3 pb-4 -mx-4 px-4 md:mx-0 md:px-0">
          {loadingSeasonal ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-44 rounded-3xl bg-white/50 animate-pulse h-32 snap-start border border-white/20" />
            ))
          ) : seasonalGuide.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant text-center py-4 w-full">暫無本月盛產資料</p>
          ) : (
            seasonalGuide.map((item, i) => (
              <m.div
                key={item.cropName}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 25 }}
              >
                <Link
                  href={`/search?q=${encodeURIComponent(item.cropName)}&type=${
                    item.category === 'fruit' ? 'Fruit' : item.category === 'meat' ? 'meat' : item.category === 'seafood' ? 'seafood' : 'Veg'
                  }`}
                  prefetch={false}
                  className="shrink-0 w-48 md:w-full rounded-3xl glass-card p-4 hover:bg-white transition-all shadow-glass-sm hover:shadow-glass flex flex-col snap-start border border-white/40 group card-lift block"
                >
                  <div className="flex items-center justify-between mb-2">
                    <CropIcon name={item.cropName} className="w-8 h-8 transition-transform group-hover:scale-110" />
                    <span className="material-symbols-outlined text-primary/40 text-lg group-hover:text-primary transition-colors">arrow_forward</span>
                  </div>
                  <h3 className="text-body-lg font-bold text-on-surface mb-1 truncate">{item.cropName}</h3>
                  <p className="text-label-sm text-primary line-clamp-2 leading-relaxed">{item.reason}</p>
                  {item.note && (
                    <p className="text-2xs text-on-surface-variant mt-2 opacity-70 truncate">{item.note}</p>
                  )}
                </Link>
              </m.div>
            ))
          )}
        </div>
      </div>
    </m.div>
  )
}
