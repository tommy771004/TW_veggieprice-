import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/env'
import { MARKETS, MARKET_REGIONS } from '@/lib/marketDirectory'
import { loadAllMarketSnapshots } from '@/lib/server/marketSnapshot'
import { BreadcrumbListJsonLd } from '@/components/seo/JsonLd'
import { ScrollToTop } from '@/components/ui/ScrollToTop'

export const revalidate = 3600

const pageUrl = `${SITE_URL}/market`
const description =
  '全台果菜批發市場今日行情：台北一、台北二、三重、板橋、台中、西螺、溪湖、高雄、屏東等市場的蔬菜水果批發均價、漲跌與交易量，依農業部資料每日更新。'

export const metadata: Metadata = {
  title: '全台果菜批發市場今日行情｜各市場菜價查詢',
  description,
  alternates: { canonical: pageUrl },
  openGraph: { title: '全台果菜批發市場今日行情 | 農時價', description, url: pageUrl, images: ['/api/og'] },
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${m}/${d}`
}

export default async function MarketIndexPage() {
  const snapshots = await loadAllMarketSnapshots(MARKETS.map((m) => m.name))

  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: '首頁', url: SITE_URL },
          { name: '批發市場行情', url: pageUrl },
        ]}
      />
      <div className="home-dashboard-shell pb-8">
        <div className="px-section-margin py-6 space-y-6 max-w-4xl mx-auto">
          <header>
            <h1 className="text-headline-lg font-black text-on-surface">全台果菜批發市場今日行情</h1>
            <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl">{description}</p>
          </header>

          {MARKET_REGIONS.map((region) => (
            <section key={region} className="section-shell">
              <h2 className="text-headline-md font-semibold text-on-surface mb-3">{region}</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MARKETS.filter((m) => m.region === region).map((m) => {
                  const snap = snapshots.get(m.name)
                  return (
                    <li key={m.name}>
                      <Link
                        href={`/market/${encodeURIComponent(m.name)}`}
                        className="glass-card rounded-2xl px-4 py-3 flex items-baseline justify-between gap-3 hover:bg-white/75 transition-colors"
                      >
                        <span className="text-body-md font-semibold text-on-surface">{m.label}</span>
                        <span className="text-label-sm text-on-surface-variant tabular-nums whitespace-nowrap">
                          {snap ? `${shortDate(snap.date)} · ${snap.items.length} 項成交` : '近期無成交'}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <ScrollToTop />
    </>
  )
}
