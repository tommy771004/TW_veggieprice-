'use client'

import { m } from 'framer-motion'
import { GlassCard } from './GlassCard'

const PROJECTS = [
  {
    title: '台灣台鐵/高鐵時刻查詢',
    url: 'https://taiwanrail.vercel.app/',
    description: '整合台鐵與高鐵即時時刻表，提供最直覺的路網查詢體驗。支援 RWD 介面，讓您的通勤行程一手掌握。',
    icon: '🚅',
    color: 'border-blue-200/50 text-blue-700',
  },
  {
    title: 'AI 行程規劃助手',
    url: 'https://roam-jelly-web.vercel.app/',
    description: '運用人工智慧為您量身打造旅遊行程。只需輸入目的地與偏好，即可生成完整的景點與路線建議。',
    icon: '✈️',
    color: 'border-purple-200/50 text-purple-700',
  },
  {
    title: 'AI 股票分析平台',
    url: 'https://stock-analyze-ai-connect.vercel.app/',
    description: '精準的 AI 股市數據分析，助您判別市場走勢。結合視覺化圖表與智能預測，優化您的投資決策。',
    icon: '📈',
    color: 'border-emerald-200/50 text-emerald-700',
  },
]

const containerVariant = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } },
}

export function RecommendedLinks() {
  return (
    <section className="mt-8 mb-12">
      <div className="flex items-center gap-2 mb-6 px-2">
        <span className="material-symbols-outlined text-primary">apps</span>
        <h2 className="text-headline-md font-bold text-on-surface">更多實用工具推薦</h2>
      </div>

      <m.div 
        variants={containerVariant}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {PROJECTS.map((project) => (
          <m.div key={project.url} variants={itemVariant}>
            <a 
              href={project.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block group h-full"
            >
              <GlassCard className={`p-5 h-full border-b-4 transition-all duration-300 group-hover:shadow-glass-md group-hover:-translate-y-1 ${project.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                    {project.icon}
                  </span>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors duration-300">
                    open_in_new
                  </span>
                </div>
                <h3 className="text-body-lg font-bold text-on-surface mb-2 px-0.5">
                  {project.title}
                </h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed line-clamp-2 px-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  {project.description}
                </p>
              </GlassCard>
            </a>
          </m.div>
        ))}
      </m.div>
    </section>
  )
}
