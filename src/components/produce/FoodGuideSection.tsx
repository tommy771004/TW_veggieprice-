import { getFoodGuide } from '@/lib/foodGuide'

const GUIDE_ROWS = [
  { key: 'health', icon: 'favorite', label: '健康搭配' },
  { key: 'plateTip', icon: 'restaurant', label: '餐盤提醒' },
  { key: 'production', icon: 'yard', label: '生產與菜圃觀察' },
  { key: 'selection', icon: 'shopping_basket', label: '選購與處理' },
] as const

export function FoodGuideSection({ cropName }: { cropName: string }) {
  const guide = getFoodGuide(cropName)
  if (!guide.isSpecific) return null

  return (
    <section className="px-section-margin max-w-7xl mx-auto pb-8" aria-labelledby="food-guide-heading">
      <div className="section-shell">
        <div className="section-heading-row gap-3 mb-5">
          <div>
            <p className="section-kicker">Food & field guide</p>
            <h2 id="food-guide-heading" className="text-headline-md font-semibold text-on-surface">
              {cropName}的健康與生產資訊
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              依常見品項整理，搭配所屬類別的一般飲食與生產原則。
            </p>
          </div>
          <span className="market-status-chip">{guide.categoryLabel}</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {GUIDE_ROWS.map((row) => (
            <article key={row.key} className="glass-card rounded-2xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-0.5" aria-hidden="true">
                {row.icon}
              </span>
              <div>
                <h3 className="text-body-md font-semibold text-on-surface">{row.label}</h3>
                <p className="mt-1 text-body-sm leading-relaxed text-on-surface-variant">{guide[row.key]}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 border-t border-outline-variant/40 pt-4">
          <p className="text-label-sm text-on-surface-variant">
            一般飲食與選購參考，非個別醫療、過敏或疾病飲食建議。資料審閱日：{guide.lastReviewed}
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {guide.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-label-bold text-primary hover:underline"
                >
                  {source.label}
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">open_in_new</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
