import {
  getGovernmentReferenceUpdatedAt,
  getNutritionReference,
  getOriginPriceReference,
  getSeasonalReference,
} from '@/lib/server/governmentReference'

const NUTRIENT_LABELS = [
  { key: 'energyKcal', label: '熱量', unit: 'kcal' },
  { key: 'proteinG', label: '蛋白質', unit: 'g' },
  { key: 'fiberG', label: '膳食纖維', unit: 'g' },
  { key: 'potassiumMg', label: '鉀', unit: 'mg' },
  { key: 'vitaminCMg', label: '維生素 C', unit: 'mg' },
] as const

function formatMonthList(months: number[]) {
  return months.map((month) => `${month}月`).join('、')
}

function formatReferenceDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(value))
}

export function GovernmentDataSection({ cropName, wholesalePrice }: { cropName: string; wholesalePrice: number }) {
  const nutrition = getNutritionReference(cropName)
  const seasonal = getSeasonalReference(cropName)
  const originPrice = getOriginPriceReference(cropName)
  const currentMonth = new Date().getMonth() + 1

  if (!nutrition && !seasonal && !originPrice) return null

  const nutrientRows = nutrition
    ? NUTRIENT_LABELS.flatMap((item) => {
      const value = nutrition.nutrients[item.key]
      return value === undefined ? [] : [{ ...item, value }]
    })
    : []

  return (
    <section className="px-section-margin max-w-7xl mx-auto pb-8" aria-labelledby="government-reference-heading">
      <div className="section-shell">
        <div className="section-heading-row gap-3 mb-5">
          <div>
            <p className="section-kicker">Official data reference</p>
            <h2 id="government-reference-heading" className="text-headline-md font-semibold text-on-surface">
              {cropName}的官方資料摘要
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              只在名稱能與官方資料可靠對應時顯示；營養數值依樣品處理方式而異。
            </p>
          </div>
          <span className="market-status-chip">資料同步 {formatReferenceDate(getGovernmentReferenceUpdatedAt())}</span>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {nutrition && (
            <article className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" aria-hidden="true">nutrition</span>
                <h3 className="text-body-lg font-semibold text-on-surface">每 100g 營養</h3>
              </div>
              <p className="mt-2 text-body-sm text-on-surface-variant">樣品：{nutrition.sampleName}</p>
              {nutrition.description && <p className="mt-1 text-label-sm leading-relaxed text-on-surface-variant">{nutrition.description}</p>}
              <dl className="mt-4 grid grid-cols-2 gap-2">
                {nutrientRows.map((item) => (
                  <div key={item.key} className="rounded-xl bg-white/55 px-3 py-2 dark:bg-white/5">
                    <dt className="text-label-sm text-on-surface-variant">{item.label}</dt>
                    <dd className="mt-0.5 text-body-md font-semibold text-on-surface tabular-nums">
                      {item.value} <span className="text-label-sm font-normal">{item.unit}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <a href="https://data.gov.tw/dataset/8543" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-label-bold text-primary hover:underline">
                查看食藥署資料集
                <span className="material-symbols-outlined text-sm" aria-hidden="true">open_in_new</span>
              </a>
            </article>
          )}

          {seasonal && (
            <article className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" aria-hidden="true">location_on</span>
                <h3 className="text-body-lg font-semibold text-on-surface">盛產與主要產地</h3>
              </div>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                官方作物：{seasonal.crop}｜盛產月份：{formatMonthList(seasonal.months)}
              </p>
              <p className={`mt-2 text-label-bold ${seasonal.months.includes(currentMonth) ? 'text-primary' : 'text-on-surface-variant'}`}>
                {seasonal.months.includes(currentMonth) ? `本月在官方盛產期內` : `本月不在官方盛產期內`}
              </p>
              <ul className="mt-4 space-y-2">
                {seasonal.origins.slice(0, 5).map((origin) => (
                  <li key={origin.county} className="text-body-sm text-on-surface-variant">
                    <span className="font-semibold text-on-surface">{origin.county}</span>
                    {origin.towns.length > 0 && `：${origin.towns.slice(0, 4).join('、')}${origin.towns.length > 4 ? '等' : ''}`}
                  </li>
                ))}
              </ul>
              <a href="https://data.gov.tw/dataset/8120" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-label-bold text-primary hover:underline">
                查看農業部資料集
                <span className="material-symbols-outlined text-sm" aria-hidden="true">open_in_new</span>
              </a>
            </article>
          )}

          {originPrice && (
            <article className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" aria-hidden="true">price_change</span>
                <h3 className="text-body-lg font-semibold text-on-surface">產地與批發觀察</h3>
              </div>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                官方品項：{originPrice.productName}｜{originPrice.year} 年 {originPrice.month} 月 {originPrice.period}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/55 px-3 py-2 dark:bg-white/5">
                  <p className="text-label-sm text-on-surface-variant">產地農場查報價</p>
                  <p className="mt-0.5 text-body-lg font-semibold text-on-surface tabular-nums">{originPrice.averagePrice}</p>
                  <p className="text-label-sm text-on-surface-variant">{originPrice.reporterCount} 個查報單位平均</p>
                </div>
                <div className="rounded-xl bg-white/55 px-3 py-2 dark:bg-white/5">
                  <p className="text-label-sm text-on-surface-variant">本頁最新批發均價</p>
                  <p className="mt-0.5 text-body-lg font-semibold text-on-surface tabular-nums">{wholesalePrice > 0 ? `$${wholesalePrice}` : '暫無'}</p>
                  <p className="text-label-sm text-on-surface-variant">元／公斤</p>
                </div>
              </div>
              <p className="mt-3 text-label-sm leading-relaxed text-on-surface-variant">
                產地查報價依官方品項可能以元／公斤或元／支（把）統計，未確認單位一致前不計算直接價差。
              </p>
              <a href="https://data.gov.tw/dataset/70930" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-label-bold text-primary hover:underline">
                查看農業部資料集
                <span className="material-symbols-outlined text-sm" aria-hidden="true">open_in_new</span>
              </a>
            </article>
          )}
        </div>
      </div>
    </section>
  )
}
