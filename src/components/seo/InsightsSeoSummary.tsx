import Link from 'next/link'
import { FaqSection, type FaqItem } from './FaqSection'
import { HowToJsonLd, MOA_OPEN_DATA_URL, WebPageJsonLd } from './JsonLd'
import { SITE_URL } from '@/lib/env'

const REST_DAY_STEPS = [
  '先選擇預計採買或交易的批發市場。',
  '查看前後 30 天是否有休市紀錄，避免把無成交日當成價格缺漏。',
  '若遇連續休市或天氣事件，改看鄰近市場或當季替代蔬果。',
]

const FAQ_ITEMS: FaqItem[] = [
  {
    q: '批發市場休市日會影響菜價判讀嗎？',
    a: '會。休市日沒有成交價格，不能拿來計算平均價或漲跌幅；判讀行情時應排除休市日，再比較前後交易日的均價與交易量。',
  },
  {
    q: '為什麼同一作物不同市場價格不同？',
    a: '不同批發市場的到貨量、產地距離、需求結構與交易時間不同，因此同一作物在台北、台中、高雄等市場可能出現不同均價。',
  },
  {
    q: '採買前應該先看休市日還是價格走勢？',
    a: '建議先確認市場是否營業，再看價格走勢。若市場即將休市，採買量與供應節奏可能提前變化，價格參考應搭配近一週或近一月走勢。',
  },
]

const FACTS = [
  ['查詢範圍', '批發市場前後 30 天休市紀錄'],
  ['主要用途', '避免將無成交日誤判為價格下跌或缺資料'],
  ['搭配頁面', '單品行情頁、當季盛產指南、類別行情總覽'],
] as const

export function InsightsSeoSummary() {
  return (
    <>
      <WebPageJsonLd
        name="市場洞察與休市日查詢"
        description="查詢台灣批發市場休市日，搭配蔬果批發價格走勢判斷採買時機。"
        url={`${SITE_URL}/insights`}
        keywords={['批發市場休市日', '台灣市場休市', '蔬果採買規劃', '菜價走勢']}
      />
      <HowToJsonLd
        name="如何用休市日判斷菜價資料"
        description="先確認市場營業日，再解讀農產品批發價格走勢。"
        steps={REST_DAY_STEPS}
      />

      <section className="px-section-margin max-w-4xl mx-auto py-6">
        <article className="section-shell space-y-5">
          <div>
            <p className="section-kicker">Market insight</p>
            <h2 className="text-headline-md font-bold text-on-surface">
              休市日如何影響菜價判斷？
            </h2>
          </div>

          <p className="text-body-md text-on-surface-variant leading-relaxed">
            批發市場休市日沒有實際成交價格，應從價格走勢中排除。農時價把休市資訊與行情頁分開呈現，讓使用者先確認市場是否營業，再比較前後交易日均價、交易量與跨市場差異。
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <tbody className="divide-y divide-outline-variant/50">
                {FACTS.map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row" className="py-3 pr-4 font-semibold text-on-surface whitespace-nowrap">
                      {label}
                    </th>
                    <td className="py-3 text-on-surface-variant leading-relaxed">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section>
              <h3 className="text-title-md font-semibold text-on-surface">
                無成交日可以當成價格下跌嗎？
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed mt-2">
                不可以。無成交日代表市場休市或沒有交易資料，價格應標記為空值；只有前後實際交易日的均價，才適合用來計算漲跌。
              </p>
            </section>
            <section>
              <h3 className="text-title-md font-semibold text-on-surface">
                採買規劃還能看哪些資料？
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed mt-2">
                可搭配
                <Link href="/seasonal" className="text-primary hover:underline"> 當季盛產指南</Link>
                與單品行情頁。產季供應穩定且今日均價低於近月平均時，通常較適合採買。
              </p>
            </section>
          </div>

          <p className="text-label-sm text-on-surface-variant">
            原始休市與行情資料來源：
            <a href={MOA_OPEN_DATA_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              農業部開放資料
            </a>
            。
          </p>
        </article>
      </section>

      <FaqSection heading="市場洞察與休市日常見問題" items={FAQ_ITEMS} url={`${SITE_URL}/insights`} />
    </>
  )
}
