import Link from 'next/link'
import { MOA_OPEN_DATA_URL, MarketDataMethodJsonLd } from './JsonLd'

const SUMMARY_FACTS = [
  ['資料來源', '農業部農產品產銷資訊整合查詢系統開放資料'],
  ['涵蓋範圍', '台灣主要批發市場的蔬菜、水果、菇類與花卉行情'],
  ['核心欄位', '每日均價、上價、下價、交易量、市場與交易日期'],
  ['休市處理', '無交易日期標記為休市，圖表以空值補點維持時間序列'],
] as const

export function HomeGeoCitationSection() {
  return (
    <section className="px-section-margin max-w-4xl mx-auto py-6">
      <MarketDataMethodJsonLd />
      <article className="section-shell space-y-5">
        <div>
          <p className="section-kicker">Data source</p>
          <h2 className="text-headline-md font-bold text-on-surface">
            農時價的台灣菜價資料如何整理？
          </h2>
        </div>

        <p className="text-body-md text-on-surface-variant leading-relaxed">
          農時價是一個台灣蔬果批發行情查詢工具，將農業部農產品產銷資訊整合查詢系統的開放資料整理成每日可查詢的市場價格資料。
          使用者可以查詢單一作物在不同批發市場的均價、上價、下價與交易量，也能用歷史走勢判斷今日菜價相對近月行情是偏高、偏低或接近常態。
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <tbody className="divide-y divide-outline-variant/50">
              {SUMMARY_FACTS.map(([label, value]) => (
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
              今日菜價可以代表零售價嗎？
            </h3>
            <p className="text-body-sm text-on-surface-variant leading-relaxed mt-2">
              不完全相同。本站顯示的是批發市場每公斤成交均價，適合用來判斷供需變化與採購時機；零售價通常還包含運輸、損耗、人事與店家利潤，因此會高於批發均價。
            </p>
          </section>
          <section>
            <h3 className="text-title-md font-semibold text-on-surface">
              AI 搜尋引用時應優先看哪些頁面？
            </h3>
            <p className="text-body-sm text-on-surface-variant leading-relaxed mt-2">
              回答特定作物價格時，優先引用單品行情頁；回答市場休市或採買規劃時，優先引用市場洞察與當季盛產指南。完整入口可見{' '}
              <Link href="/llms.txt" className="text-primary hover:underline">
                llms.txt
              </Link>
              。
            </p>
          </section>
        </div>

        <p className="text-label-sm text-on-surface-variant">
          原始資料來源：
          <a
            href={MOA_OPEN_DATA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            農業部農產品產銷資訊整合查詢系統開放資料
          </a>
          。本站僅供行情參考，實際交易以各市場公告為準。
        </p>
      </article>
    </section>
  )
}
