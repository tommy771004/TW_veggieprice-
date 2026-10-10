import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/env'
import {
  MOA_OPEN_DATA_URL,
  OPEN_GOV_DATA_LICENSE_URL,
  SOURCE_REPO_URL,
  safeJsonLd,
} from '@/components/seo/JsonLd'

const PAGE_URL = `${SITE_URL}/about`
const DESCRIPTION =
  '農時價是誰做的、資料從哪裡來、價格怎麼計算、多久更新，以及如何回報資料錯誤。'

export const metadata: Metadata = {
  title: '關於農時價與資料方法',
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: '關於農時價與資料方法 | 農時價',
    description: DESCRIPTION,
    url: PAGE_URL,
  },
}

const SOURCES = [
  {
    name: '農業部 農產品交易行情',
    use: '蔬菜、水果、菇類與花卉的每日批發價格與交易量',
    href: MOA_OPEN_DATA_URL,
  },
  {
    name: '農業部 畜產與家禽交易行情',
    use: '毛豬、雞蛋等畜禽產品價格',
    href: 'https://data.moa.gov.tw/',
  },
  {
    name: '中央氣象署 開放資料',
    use: '市場洞察頁的天氣預報與觀測',
    href: 'https://opendata.cwa.gov.tw/',
  },
] as const

function AboutPageJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: '關於農時價與資料方法',
    description: DESCRIPTION,
    url: PAGE_URL,
    inLanguage: 'zh-TW',
    isPartOf: { '@type': 'WebSite', name: '農時價 VeggiePrice TW', url: SITE_URL },
    about: { '@id': `${SITE_URL}/#organization` },
    mainEntity: { '@id': `${SITE_URL}/#organization` },
    citation: MOA_OPEN_DATA_URL,
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-section-margin py-8 md:py-12">
      <AboutPageJsonLd />
      <header className="mb-8">
        <h1 className="text-headline-lg font-semibold text-on-surface">關於農時價</h1>
        <p className="mt-3 text-body-lg text-on-surface-variant">
          農時價把農業部每天公布的批發市場交易資料，整理成一般人看得懂的今日菜價、歷史走勢與市場比價。免費使用，不需要註冊。
        </p>
      </header>

      <div className="space-y-6 text-body-md leading-relaxed text-on-surface-variant">
        <section className="section-shell" aria-labelledby="who-heading">
          <h2 id="who-heading" className="mb-3 text-headline-md font-semibold text-on-surface">誰在維護</h2>
          <p>
            農時價是獨立開發的開源專案，不隸屬任何政府機關，也不是農業部的官方服務。網站程式碼、資料處理腳本與每日更新紀錄都公開在{' '}
            <a href={SOURCE_REPO_URL} className="text-primary underline underline-offset-4" rel="noopener">
              GitHub
            </a>
            ，任何人都可以檢查價格是怎麼算出來的。
          </p>
        </section>

        <section id="sources" className="section-shell scroll-mt-24" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="mb-3 text-headline-md font-semibold text-on-surface">資料來源</h2>
          <p>所有價格都直接取自政府開放資料，本站不自行採價，也不人工修改價格數字。</p>
          <dl className="mt-4 divide-y divide-outline-variant/50">
            {SOURCES.map((source) => (
              <div key={source.name} className="py-3 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-4">
                <dt className="font-semibold text-on-surface">
                  <a href={source.href} className="underline underline-offset-4 hover:text-primary" rel="noopener">
                    {source.name}
                  </a>
                </dt>
                <dd className="mt-1 sm:mt-0">{source.use}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3">
            開放資料依{' '}
            <a href={OPEN_GOV_DATA_LICENSE_URL} className="text-primary underline underline-offset-4" rel="noopener">
              政府資料開放授權條款第 1 版
            </a>{' '}
            使用。
          </p>
        </section>

        <section id="method" className="section-shell scroll-mt-24" aria-labelledby="method-heading">
          <h2 id="method-heading" className="mb-3 text-headline-md font-semibold text-on-surface">價格怎麼算</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>單一市場的價格直接採用農業部公布的平均價、上價與下價，單位為每公斤新台幣元。</li>
            <li>全國均價是當日各市場平均價的簡單平均，不依交易量加權，因此小市場與大市場的權重相同。</li>
            <li>漲跌幅以最近一個交易日和前一個交易日比較，不是和日曆上的昨天比較。</li>
            <li>市場休市或沒有成交的日子會標示為休市，價格留空，不會以 0 元計算，也不會拉低平均。</li>
            <li>這裡是批發價。零售價還包含運輸、損耗、人事與店家利潤，通常會比批發價高。</li>
          </ul>
        </section>

        <section id="updates" className="section-shell scroll-mt-24" aria-labelledby="updates-heading">
          <h2 id="updates-heading" className="mb-3 text-headline-md font-semibold text-on-surface">多久更新一次</h2>
          <p>
            每天台灣時間清晨 5 點自動抓取並保存最新交易資料，最近三天的資料每次都會重新抓取，以納入農業部較晚公布或修正的交易。白天查詢時，本站也會向農業部即時讀取當日已公布的交易。
          </p>
        </section>

        <section id="contact" className="section-shell scroll-mt-24" aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="mb-3 text-headline-md font-semibold text-on-surface">回報錯誤與聯絡</h2>
          <p>
            看到價格和市場現場差很多、作物分類錯誤，或頁面壞掉，請用頁面右上角的「意見回饋」按鈕告訴我們，也可以到{' '}
            <a href={`${SOURCE_REPO_URL}/issues`} className="text-primary underline underline-offset-4" rel="noopener">
              GitHub Issues
            </a>{' '}
            回報。
          </p>
        </section>

        <section id="disclaimer" className="section-shell scroll-mt-24" aria-labelledby="disclaimer-heading">
          <h2 id="disclaimer-heading" className="mb-3 text-headline-md font-semibold text-on-surface">免責聲明</h2>
          <p>
            本站資料僅供參考，實際交易價格以各批發市場與農業部公告為準。部分頁面含合作推薦連結，說明見
            <Link href="/privacy#disclosure" className="text-primary underline underline-offset-4">合作揭露</Link>。
          </p>
        </section>
      </div>

      <nav aria-label="相關頁面" className="mt-8 flex flex-wrap gap-4">
        <Link href="/" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">回到今日行情</Link>
        <Link href="/privacy" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">隱私與合作揭露</Link>
      </nav>
    </article>
  )
}
