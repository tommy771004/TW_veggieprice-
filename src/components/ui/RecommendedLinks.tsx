'use client'

import { m } from 'framer-motion'
import { GlassCard } from './GlassCard'
import { RECOMMENDED_PROJECTS } from '@/lib/recommendedProjects'

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
    <section>
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
        {RECOMMENDED_PROJECTS.map((project) => (
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
