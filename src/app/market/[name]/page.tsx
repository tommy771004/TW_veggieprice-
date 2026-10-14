import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SITE_URL } from '@/lib/env'
import { MARKETS, findMarket, marketShortName } from '@/lib/marketDirectory'
import { topMovers, type MarketCropItem } from '@/lib/marketSnapshot'
import { siteCropForMoaName } from '@/lib/moaCropNames'
import { loadMarketSnapshot, loadUpcomingRestDays } from '@/lib/server/marketSnapshot'
import { BreadcrumbListJsonLd, MarketDatasetJsonLd } from '@/components/seo/JsonLd'
import { TrendChip } from '@/components/ui/TrendChip'
import { ScrollToTop } from '@/components/ui/ScrollToTop'

type Props = { params: Promise<{ name: string }> }

// Daily files land once a day (plus late-market refreshes); hourly is plenty.
export const revalidate = 3600

export function generateStaticParams() {
  return MARKETS.map((m) => ({ name: m.name }))
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${m}/${d}（${weekday}）`
}

function fmt(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(1)
}

function tonnes(kg: number): string {
  return (kg / 1000).toLocaleString('zh-TW', { maximumFractionDigits: 1 })
}

function cropHref(item: MarketCropItem): string {
  return `/produce/${encodeURIComponent(siteCropForMoaName(item.name))}`
}

function cropLabel(item: MarketCropItem): string {
  const site = siteCropForMoaName(item.name)
  return site === item.name ? item.name : `${item.name}（${site}）`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params
  const market = findMarket(decodeURIComponent(name))
  if (!market) return {}
  const short = marketShortName(market)
  const pageUrl = `${SITE_URL}/market/${encodeURIComponent(market.name)}`
  const snapshot = await loadMarketSnapshot(market.name)
  const top = snapshot?.items.slice(0, 3).map((i) => siteCropForMoaName(i.name)).join('、')
  const title = snapshot
    ? `${short}今日菜價查詢｜${market.label}行情（${dateLabel(snapshot.date).split('（')[0]}）`
    : `${short}今日菜價查詢｜${market.label}行情`
  const description = snapshot
    ? `${market.label}${dateLabel(snapshot.date)}共 ${snapshot.items.length} 項蔬果成交，總交易量 ${tonnes(snapshot.totalVolume)} 公噸，${top}交易量最大。查詢${short}今日蔬菜、水果批發均價、漲跌幅與休市日，依農業部資料每日更新。`
    : `查詢${market.label}今日蔬菜、水果批發均價、漲跌幅與休市日，依農業部農產品交易行情資料每日更新。`
  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: { title: `${title} | 農時價`, description, url: pageUrl, images: ['/api/og'] },
  }
}

export default async function MarketPage({ params }: Props) {
  const { name } = await params
  const market = findMarket(decodeURIComponent(name))
  if (!market) notFound()

  const short = marketShortName(market)
  const pageUrl = `${SITE_URL}/market/${encodeURIComponent(market.name)}`
  const [snapshot, restDays] = await Promise.all([
    loadMarketSnapshot(market.name),
    loadUpcomingRestDays(market.name),
  ])
  const movers = snapshot ? topMovers(snapshot.items) : { up: [], down: [] }
  const neighbours = MARKETS.filter((m) => m.region === market.region && m.name !== market.name)

  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: '首頁', url: SITE_URL },
          { name: '批發市場行情', url: `${SITE_URL}/market` },
          { name: market.label, url: pageUrl },
        ]}
      />
      <MarketDatasetJsonLd marketLabel={market.label} url={pageUrl} />
      <div className="home-dashboard-shell pb-8">
        <div className="px-section-margin py-6 space-y-6 max-w-4xl mx-auto">
          <header>
            <h1 className="text-headline-lg font-black text-on-surface">{market.label}今日行情</h1>
            {snapshot ? (
              <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
                {`${short}最近交易日為 ${dateLabel(snapshot.date)}，共 ${snapshot.items.length} 項蔬果成交，總交易量約 ${tonnes(snapshot.totalVolume)} 公噸。`}
                {snapshot.prevDate && `漲跌以前一交易日 ${dateLabel(snapshot.prevDate)}為基準。`}
              </p>
            ) : (
              <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl">
                {market.label}近兩週沒有成交資料，可能逢休市或資料尚未同步，請稍後再查。
              </p>
            )}
          </header>

          {snapshot && (
            <dl className="grid grid-cols-3 gap-3">
              <div className="glass-card rounded-2xl px-4 py-3">
                <dt className="text-label-sm text-on-surface-variant">交易日</dt>
                <dd className="text-title-lg font-bold text-on-surface tabular-nums">{dateLabel(snapshot.date)}</dd>
              </div>
              <div className="glass-card rounded-2xl px-4 py-3">
                <dt className="text-label-sm text-on-surface-variant">成交品項</dt>
                <dd className="text-title-lg font-bold text-on-surface tabular-nums">{snapshot.items.length}</dd>
              </div>
              <div className="glass-card rounded-2xl px-4 py-3">
                <dt className="text-label-sm text-on-surface-variant">交易量（公噸）</dt>
                <dd className="text-title-lg font-bold text-on-surface tabular-nums">{tonnes(snapshot.totalVolume)}</dd>
              </div>
            </dl>
          )}

          {(movers.up.length > 0 || movers.down.length > 0) && (
            <section className="section-shell grid sm:grid-cols-2 gap-6" aria-label={`${short}今日漲跌`}>
              {[
                { title: '漲幅最大', items: movers.up },
                { title: '跌幅最大', items: movers.down },
              ].map((group) => (
                <div key={group.title}>
                  <h2 className="text-title-md font-semibold text-on-surface mb-2">{group.title}</h2>
                  {group.items.length > 0 ? (
                    <ol className="space-y-1.5">
                      {group.items.map((item) => (
                        <li key={item.name} className="flex items-center justify-between gap-3 text-body-sm">
                          <Link href={cropHref(item)} className="text-on-surface hover:text-primary transition-colors">
                            {cropLabel(item)}
                          </Link>
                          <span className="flex items-center gap-2">
                            <span className="text-on-surface-variant tabular-nums">{fmt(item.avgPrice)} 元</span>
                            <TrendChip change={item.changePct} size="sm" />
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-body-sm text-on-surface-variant">今日無明顯{group.title === '漲幅最大' ? '上漲' : '下跌'}品項。</p>
                  )}
                </div>
              ))}
            </section>
          )}

          {snapshot && (
            <section className="section-shell">
              <h2 className="text-headline-md font-semibold text-on-surface mb-3">{short}各作物批發價</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-body-sm">
                  <caption className="sr-only">
                    {market.label}{dateLabel(snapshot.date)}各作物批發均價、漲跌與交易量，依交易量排序
                  </caption>
                  <thead>
                    <tr className="text-on-surface-variant border-b border-outline-variant/50">
                      <th scope="col" className="py-2 pr-4 font-semibold">作物</th>
                      <th scope="col" className="py-2 pr-4 font-semibold text-right">均價（元/公斤）</th>
                      <th scope="col" className="py-2 pr-4 font-semibold text-right">較前一交易日</th>
                      <th scope="col" className="py-2 font-semibold text-right">交易量（公斤）</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {snapshot.items.map((item) => (
                      <tr key={item.name}>
                        <td className="py-2 pr-4">
                          <Link href={cropHref(item)} className="text-on-surface hover:text-primary transition-colors">
                            {cropLabel(item)}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 text-right text-on-surface font-medium tabular-nums">{fmt(item.avgPrice)}</td>
                        <td className="py-2 pr-4 text-right">
                          {item.changePct === null ? (
                            <span className="text-on-surface-variant">前日無成交</span>
                          ) : (
                            <TrendChip change={item.changePct} size="sm" />
                          )}
                        </td>
                        <td className="py-2 text-right text-on-surface-variant tabular-nums">
                          {item.volume.toLocaleString('zh-TW')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-label-sm text-on-surface-variant mt-3">
                同一作物的不同品種（如甘藍-初秋、甘藍-改良種）已依交易量加權合併。資料來源：農業部農產品交易行情，僅供行情參考。
              </p>
            </section>
          )}

          <section className="section-shell">
            <h2 className="text-headline-md font-semibold text-on-surface mb-2">{short}休市日</h2>
            {restDays.length > 0 ? (
              <p className="text-body-md text-on-surface-variant">
                接下來公告的休市日：
                <strong className="text-on-surface">{restDays.map(dateLabel).join('、')}</strong>。
                <Link href="/insights" className="text-primary hover:underline ml-1">查看全台休市日</Link>
              </p>
            ) : (
              <p className="text-body-md text-on-surface-variant">
                目前沒有公告中的休市日。<Link href="/insights" className="text-primary hover:underline">查看全台休市日</Link>
              </p>
            )}
          </section>

          <nav className="section-shell" aria-label="其他批發市場">
            <h2 className="text-headline-md font-semibold text-on-surface mb-3">{market.region}其他市場</h2>
            <ul className="flex flex-wrap gap-2">
              {neighbours.map((m) => (
                <li key={m.name}>
                  <Link
                    href={`/market/${encodeURIComponent(m.name)}`}
                    className="market-status-chip hover:bg-surface-container-high transition-colors"
                  >
                    {m.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/market" className="market-status-chip hover:bg-surface-container-high transition-colors">
                  全台批發市場
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <ScrollToTop />
    </>
  )
}
