import Link from 'next/link'
import { ItemListJsonLd, WebPageJsonLd } from './JsonLd'
import { SITE_URL } from '@/lib/env'

const CATEGORY_FACTS: Record<string, Array<[string, string]>> = {
  vegetable: [
    ['判讀重點', '葉菜與根莖類容易受天氣、產地供應與休市日影響'],
    ['常見用途', '比較今日菜價、採買成本與近期均價區間'],
  ],
  fruit: [
    ['判讀重點', '水果價格通常與產季、進口供應與節慶需求連動'],
    ['常見用途', '比較今日水果批發價與當季供應穩定度'],
  ],
  mushroom: [
    ['判讀重點', '菇類價格多受供應穩定度、保存性與需求變化影響'],
    ['常見用途', '比較香菇、金針菇、杏鮑菇等單品批發行情'],
  ],
  flower: [
    ['判讀重點', '花卉價格常受節日、婚禮需求與拍賣市場供需影響'],
    ['常見用途', '比較切花與主要花卉批發市場行情'],
  ],
}

export function CategoryHubSeoSummary({
  category,
  label,
  description,
  crops,
}: {
  category: string
  label: string
  description: string
  crops: string[]
}) {
  const pageUrl = `${SITE_URL}/produce/category/${category}`
  const facts = CATEGORY_FACTS[category] ?? [
    ['判讀重點', '先比較今日均價，再搭配近月走勢與交易量'],
    ['常見用途', '查詢單品批發行情與跨市場價格差異'],
  ]
  const itemList = crops.map((crop) => ({
    name: `${crop}批發行情`,
    url: `${SITE_URL}/produce/${encodeURIComponent(crop)}`,
    description: `${crop}今日批發均價、近期走勢與跨市場比價。`,
  }))

  return (
    <section className="space-y-4">
      <WebPageJsonLd
        name={`${label}批發行情總覽`}
        description={description}
        url={pageUrl}
        keywords={[`${label}批發行情`, '台灣菜價', '農產品批發價格', '今日批發價']}
      />
      <ItemListJsonLd
        name={`${label}作物行情列表`}
        description={`${label}常見作物的台灣批發市場行情入口。`}
        url={pageUrl}
        items={itemList}
      />

      <article className="section-shell space-y-4">
        <div>
          <p className="section-kicker">Category guide</p>
          <h2 className="text-headline-md font-semibold text-on-surface">
            如何判讀{label}批發行情？
          </h2>
        </div>

        <p className="text-body-md text-on-surface-variant leading-relaxed">
          {label}行情應同時看今日均價、交易量與近月走勢。農時價將每個作物連到單品行情頁，方便比較不同批發市場的每公斤均價與近期價格區間。
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <tbody className="divide-y divide-outline-variant/50">
              <tr>
                <th scope="row" className="py-3 pr-4 font-semibold text-on-surface whitespace-nowrap">收錄作物</th>
                <td className="py-3 text-on-surface-variant leading-relaxed">{crops.length} 項</td>
              </tr>
              {facts.map(([labelText, value]) => (
                <tr key={labelText}>
                  <th scope="row" className="py-3 pr-4 font-semibold text-on-surface whitespace-nowrap">{labelText}</th>
                  <td className="py-3 text-on-surface-variant leading-relaxed">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-title-md font-semibold text-on-surface mb-2">
            熱門{label}行情入口
          </h3>
          <ul className="flex flex-wrap gap-2">
            {crops.slice(0, 8).map((crop) => (
              <li key={crop}>
                <Link
                  href={`/produce/${encodeURIComponent(crop)}`}
                  className="market-status-chip hover:bg-surface-container-high transition-colors"
                >
                  {crop}行情
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </section>
  )
}
