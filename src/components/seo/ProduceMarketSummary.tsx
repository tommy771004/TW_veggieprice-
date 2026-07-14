import Link from 'next/link'
import { getCropBaseInfo } from '@/lib/cropInfo'
import type { HistoryPoint } from '@/lib/server/moa'
import type { MarketComparison } from '@/lib/types'

// Server-rendered, fully crawlable summary of a crop's wholesale market data.
//
// The interactive dashboard (ProduceClient) loads its data client-side, so its
// numbers are invisible to Googlebot's initial render. This component ships the
// same facts as plain HTML tables + prose with real statistics, which:
//   • differentiates each /produce/[id] page (fixes "discovered, not indexed"),
//   • gives AI search engines answer-first, extractable, statistic-rich content.
// Every fetch is best-effort: a failed/empty source degrades to a smaller block,
// never an error, so the page always renders.

function fmt(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(1)
}

function changeLabel(pct: number): string {
  if (pct > 0.05) return `上漲 ${fmt(pct)}%`
  if (pct < -0.05) return `下跌 ${fmt(Math.abs(pct))}%`
  return '持平'
}

export function ProduceMarketSummary({
  cropName,
  history,
  markets = [],
}: {
  cropName: string
  history: HistoryPoint[]
  markets?: MarketComparison[]
}) {
  const info = getCropBaseInfo(cropName)
  const valid = history.filter(
    (p): p is HistoryPoint & { avgPrice: number } => p.avgPrice !== null && p.avgPrice > 0,
  )
  const latest = valid[valid.length - 1]
  const prev = valid[valid.length - 2]
  const changePct = latest && prev && prev.avgPrice > 0
    ? ((latest.avgPrice - prev.avgPrice) / prev.avgPrice) * 100
    : 0
  const prices = valid.map((p) => p.avgPrice)
  const high = prices.length ? Math.max(...prices) : 0
  const low = prices.length ? Math.min(...prices) : 0
  const avg = prices.length ? prices.reduce((s, n) => s + n, 0) / prices.length : 0
  const windowDays = valid.length
  const cheapest = markets[0]
  const priciest = markets[markets.length - 1]
  const marketAvg = markets.length ? markets.reduce((s, m) => s + m.avgPrice, 0) / markets.length : 0

  // Some crops are stored under an alias in the synced daily files, so the
  // exact-match history reader returns nothing while the includes-match market
  // query still does. Fall back to today's cross-market average so the page can
  // still state a real headline price instead of an empty placeholder.
  const latestPrice = latest?.avgPrice ?? marketAvg

  // Last ~12 trading days, most-recent first, for a compact crawlable table.
  const recentRows = [...valid].slice(-12).reverse()

  return (
    <section className="px-section-margin max-w-4xl mx-auto py-6">
      <article className="section-shell space-y-5">
        <div>
          <p className="section-kicker">Market summary</p>
          <h2 className="text-headline-md font-bold text-on-surface">
            {cropName} 批發價格總覽（資料來源：農業部）
          </h2>
        </div>

        {latestPrice > 0 ? (
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            根據農業部農產品交易資料，{cropName}最近一個交易日的全台批發均價約為每公斤
            <strong className="text-on-surface"> {fmt(latestPrice)} 元</strong>
            {latest && <>，較前一交易日{changeLabel(changePct)}</>}。
            {windowDays > 0 && (
              <>
                {' '}近 {windowDays} 個交易日的均價區間落在 <strong className="text-on-surface">{fmt(low)}–{fmt(high)} 元</strong>，
                平均約 <strong className="text-on-surface">{fmt(avg)} 元</strong>。
              </>
            )}
            {cheapest && priciest && cheapest.marketName !== priciest.marketName && (
              <>
                {' '}今日各市場中以
                <strong className="text-on-surface">{cheapest.marketName}（{fmt(cheapest.avgPrice)} 元）</strong>
                最低、
                <strong className="text-on-surface">{priciest.marketName}（{fmt(priciest.avgPrice)} 元）</strong>
                最高。
              </>
            )}
            {' '}批發均價為市場大宗成交價，通常低於零售價，可作為採購時機的參考。
          </p>
        ) : (
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            {cropName}近期逢市場休市或暫無成交資料，價格不列入計算。可查看下方產季與產地資訊，或稍後再查最新批發行情。
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <caption className="sr-only">{cropName} 作物產季與產地基本資料</caption>
            <tbody className="divide-y divide-outline-variant/50">
              <tr>
                <th scope="row" className="py-3 pr-4 font-semibold text-on-surface whitespace-nowrap">作物特徵</th>
                <td className="py-3 text-on-surface-variant leading-relaxed">{info.feature}</td>
              </tr>
              <tr>
                <th scope="row" className="py-3 pr-4 font-semibold text-on-surface whitespace-nowrap">主要產季</th>
                <td className="py-3 text-on-surface-variant leading-relaxed">{info.season}</td>
              </tr>
              <tr>
                <th scope="row" className="py-3 pr-4 font-semibold text-on-surface whitespace-nowrap">主要產地</th>
                <td className="py-3 text-on-surface-variant leading-relaxed">{info.staticOrigin}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {recentRows.length > 0 && (
          <div>
            <h3 className="text-title-md font-semibold text-on-surface mb-2">
              {cropName} 近期每日批發均價
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm">
                <caption className="sr-only">{cropName} 最近交易日的批發均價與交易量</caption>
                <thead>
                  <tr className="text-on-surface-variant border-b border-outline-variant/50">
                    <th scope="col" className="py-2 pr-4 font-semibold">交易日期</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">批發均價（元/公斤）</th>
                    <th scope="col" className="py-2 font-semibold">交易量（公斤）</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {recentRows.map((row) => (
                    <tr key={row.date}>
                      <td className="py-2 pr-4 text-on-surface-variant whitespace-nowrap">{row.date}</td>
                      <td className="py-2 pr-4 text-on-surface font-medium tabular-nums">{fmt(row.avgPrice)}</td>
                      <td className="py-2 text-on-surface-variant tabular-nums">
                        {row.volume != null ? row.volume.toLocaleString('en-US') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {markets.length > 0 && (
          <div>
            <h3 className="text-title-md font-semibold text-on-surface mb-2">
              {cropName} 各批發市場今日比價
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm">
                <caption className="sr-only">{cropName} 在各批發市場的今日均價與漲跌</caption>
                <thead>
                  <tr className="text-on-surface-variant border-b border-outline-variant/50">
                    <th scope="col" className="py-2 pr-4 font-semibold">批發市場</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">均價（元/公斤）</th>
                    <th scope="col" className="py-2 font-semibold">較前一交易日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {markets.map((m) => (
                    <tr key={m.marketName}>
                      <td className="py-2 pr-4 text-on-surface whitespace-nowrap">{m.marketName}</td>
                      <td className="py-2 pr-4 text-on-surface font-medium tabular-nums">{fmt(m.avgPrice)}</td>
                      <td className="py-2 text-on-surface-variant tabular-nums">{changeLabel(m.priceChange)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-label-sm text-on-surface-variant">
          想看互動式走勢圖與更長區間，請見上方
          <Link href={`/produce/${encodeURIComponent(cropName)}`} className="text-primary hover:underline"> {cropName} 行情頁</Link>
          。資料每日依農業部公布之批發市場實際成交資料更新，僅供行情參考。
        </p>
      </article>
    </section>
  )
}
