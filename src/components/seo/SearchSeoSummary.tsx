import Link from 'next/link'
import { FaqSection, type FaqItem } from './FaqSection'
import { HowToJsonLd, MOA_OPEN_DATA_URL, WebPageJsonLd } from './JsonLd'
import { SITE_URL } from '@/lib/env'

const HOW_TO_STEPS = [
  '先輸入作物名稱，例如高麗菜、香蕉或番茄。',
  '選擇蔬菜市場或水果市場，必要時再指定批發市場。',
  '切換今日、近一週或近一月，觀察均價與交易量是否偏離近期常態。',
  '進入單品行情頁查看歷史走勢、跨市場比價與休市日補點。',
]

const FAQ_ITEMS: FaqItem[] = [
  {
    q: '農產品批發價格搜尋結果代表零售價嗎？',
    a: '不代表。農時價顯示的是批發市場每公斤成交均價，通常低於傳統市場或超市零售價；零售端還會包含運輸、損耗、人事與店家利潤。',
  },
  {
    q: '搜尋菜價時應該看今日還是近一月？',
    a: '若要掌握當天採購成本，可先看今日行情；若要判斷價格是否偏高，建議同時查看近一月走勢，將今日均價與近期平均區間比較。',
  },
  {
    q: '為什麼某些日期沒有價格？',
    a: '批發市場休市或無成交時不會產生交易價格。農時價會將這類日期視為休市或空值，不會把無成交誤判為價格為 0。',
  },
]

const QUICK_LINKS = [
  ['高麗菜批發價', '/produce/%E9%AB%98%E9%BA%97%E8%8F%9C'],
  ['香蕉批發價', '/produce/%E9%A6%99%E8%95%89'],
  ['番茄批發價', '/produce/%E7%95%AA%E8%8C%84'],
  ['蔬菜類行情', '/produce/category/vegetable'],
  ['水果類行情', '/produce/category/fruit'],
] as const

export function SearchSeoSummary() {
  return (
    <>
      <WebPageJsonLd
        name="搜尋農產品批發價格"
        description="依作物、市場與日期查詢台灣農產品批發市場均價、交易量與歷史走勢。"
        url={`${SITE_URL}/search`}
        keywords={['農產品批發價格搜尋', '今日菜價查詢', '台灣批發市場行情', '蔬果價格']}
      />
      <HowToJsonLd
        name="如何用農時價搜尋今日菜價"
        description="用作物名稱、市場與日期範圍查詢台灣農產品批發均價。"
        steps={HOW_TO_STEPS}
      />

      <section className="px-section-margin max-w-4xl mx-auto py-6">
        <article className="section-shell space-y-5">
          <div>
            <p className="section-kicker">Search guide</p>
            <h2 className="text-headline-md font-bold text-on-surface">
              如何查詢台灣農產品批發價格？
            </h2>
          </div>

          <p className="text-body-md text-on-surface-variant leading-relaxed">
            農時價可用作物名稱、市場與日期範圍搜尋台灣批發市場行情。每筆結果以農業部開放資料為基礎，整理出每公斤均價、漲跌幅與交易量，適合比較今日菜價是否高於近期常態。
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <section>
              <h3 className="text-title-md font-semibold text-on-surface">
                搜尋結果應該先看哪個欄位？
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed mt-2">
                先看均價與交易量。均價反映每公斤成交水準，交易量則能輔助判斷供應是否穩定；若均價上升但交易量偏低，通常代表短期供給偏緊。
              </p>
            </section>

            <section>
              <h3 className="text-title-md font-semibold text-on-surface">
                批發價格資料從哪裡來？
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed mt-2">
                價格資料引用農業部農產品產銷資訊整合查詢系統開放資料。本站只整理公開交易行情，實際成交仍以各批發市場公告為準。
              </p>
            </section>
          </div>

          <div>
            <h3 className="text-title-md font-semibold text-on-surface mb-2">
              搜尋菜價的 4 個步驟
            </h3>
            <ol className="list-decimal pl-5 space-y-2 text-body-sm text-on-surface-variant leading-relaxed">
              {HOW_TO_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <nav aria-label="常用菜價查詢入口">
            <ul className="flex flex-wrap gap-2">
              {QUICK_LINKS.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="market-status-chip hover:bg-surface-container-high transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <p className="text-label-sm text-on-surface-variant">
            原始資料來源：
            <a href={MOA_OPEN_DATA_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              農業部農產品產銷資訊整合查詢系統開放資料
            </a>
            。
          </p>
        </article>
      </section>

      <FaqSection heading="農產品批發價格搜尋常見問題" items={FAQ_ITEMS} url={`${SITE_URL}/search`} />
    </>
  )
}
