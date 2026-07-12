'use client'

import Link from 'next/link'
import { m } from 'framer-motion'

const FEATURES = [
  {
    href: '/search',
    icon: 'search',
    emoji: '🔍',
    title: '全品項搜尋',
    desc: '蔬果 × 市場 × 日期多維度篩選，快速比價',
    gradient: 'from-emerald-500/10 to-green-400/5',
    accent: 'text-emerald-700',
  },
  {
    href: '/seasonal',
    icon: 'local_florist',
    emoji: '🌱',
    title: '當季盛產指南',
    desc: '依月份推薦 CP 值高、供應穩定的採買清單',
    gradient: 'from-lime-500/10 to-emerald-400/5',
    accent: 'text-lime-700',
  },
  {
    href: '/healthy-basket',
    icon: 'nutrition',
    emoji: '🥗',
    title: '一餐好菜籃',
    desc: '用當季食材組一餐，再檢查我的餐盤六大類是否完整',
    gradient: 'from-orange-400/10 to-rose-400/5',
    accent: 'text-orange-700',
  },
  {
    href: '/watchlist',
    icon: 'monitoring',
    emoji: '📌',
    title: '追蹤清單',
    desc: '釘選常買作物，一眼掌握今日漲跌',
    gradient: 'from-teal-500/10 to-cyan-400/5',
    accent: 'text-teal-700',
  },
] as const

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const card = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 340, damping: 26 },
  },
}

export function ExploreSection() {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary">explore</span>
        <h2 className="text-headline-md font-bold text-on-surface">探索功能</h2>
      </div>

      <m.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-40px' }}
      >
        {FEATURES.map((f) => (
          <m.div key={f.href} variants={card}>
            <Link
              href={f.href}
              className={`explore-card rounded-3xl p-5 flex flex-col gap-3 bg-gradient-to-br ${f.gradient} h-full block`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl leading-none">{f.emoji}</span>
                <span className="material-symbols-outlined text-outline/50 text-xl group-hover:text-primary transition-colors">
                  arrow_forward
                </span>
              </div>
              <div>
                <h3 className={`text-body-lg font-bold ${f.accent} mb-1`}>{f.title}</h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">{f.desc}</p>
              </div>
            </Link>
          </m.div>
        ))}
      </m.div>
    </section>
  )
}
