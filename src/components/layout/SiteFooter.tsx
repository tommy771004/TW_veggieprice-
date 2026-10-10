import Link from 'next/link'
import { MOA_OPEN_DATA_URL, SOURCE_REPO_URL } from '@/components/seo/JsonLd'

// Site-wide trust links: who runs the site, where the numbers come from, and
// the privacy/disclosure page. Crawlers and visitors should reach these from
// every page, not only from Settings.
export function SiteFooter() {
  return (
    <footer className="max-w-7xl mx-auto w-full px-section-margin pt-6 pb-8 text-body-sm text-on-surface-variant">
      <div className="border-t border-outline-variant/60 pt-5 flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
        <p>
          價格資料來自{' '}
          <a href={MOA_OPEN_DATA_URL} className="underline underline-offset-4 hover:text-primary" rel="noopener">
            農業部開放資料
          </a>
          ，僅供參考。
        </p>
        <nav aria-label="網站資訊">
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li><Link href="/about" className="inline-flex min-h-11 items-center hover:text-primary">關於農時價</Link></li>
            <li><Link href="/about#method" className="inline-flex min-h-11 items-center hover:text-primary">資料方法</Link></li>
            <li><Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-primary">隱私與合作揭露</Link></li>
            <li>
              <a href={SOURCE_REPO_URL} className="inline-flex min-h-11 items-center hover:text-primary" rel="noopener">
                GitHub
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
