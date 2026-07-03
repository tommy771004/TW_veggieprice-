import Link from 'next/link'
import { COMMON_CROPS } from '@/lib/crops'

// Server-rendered link hub for the homepage.
//
// HomeClient is a client component, so its links are not in Googlebot's initial
// render. This block guarantees crawlable <a> paths from the site's most
// authoritative page to the category hubs and to popular produce pages, giving
// Google a real internal link graph (homepage → category → every crop) instead
// of relying on the sitemap alone. Directly targets "discovered, not indexed".

const CATEGORY_LINKS: Array<{ slug: string; label: string }> = [
  { slug: 'vegetable', label: '蔬菜類批發行情' },
  { slug: 'fruit', label: '水果類批發行情' },
  { slug: 'mushroom', label: '菇類批發行情' },
]

// A curated set of high-interest crops; the rest stay reachable via the category
// hubs above, so every produce page has at least one crawlable inbound link.
const FEATURED_CROPS: string[] = [
  '高麗菜', '番茄', '洋蔥', '胡蘿蔔', '青椒', '花椰菜', '白蘿蔔', '空心菜',
  '香蕉', '鳳梨', '木瓜', '葡萄', '蘋果', '芒果', '芭樂', '西瓜',
  '香菇', '金針菇', '杏鮑菇',
].filter((crop) => (COMMON_CROPS as readonly string[]).includes(crop))

export function HomeSeoLinks() {
  return (
    <section className="px-section-margin max-w-4xl mx-auto py-6" aria-label="批發行情快速入口">
      <article className="section-shell space-y-5">
        <div>
          <p className="section-kicker">Quick links</p>
          <h2 className="text-headline-md font-bold text-on-surface">熱門蔬果批發行情查詢</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            依類別瀏覽全台批發市場行情，或直接查看熱門單品的今日均價與歷史走勢。
          </p>
        </div>

        <nav aria-label="作物類別">
          <ul className="flex flex-wrap gap-2">
            {CATEGORY_LINKS.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/produce/category/${c.slug}`}
                  className="market-status-chip hover:bg-surface-container-high transition-colors"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="熱門單品行情">
          <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {FEATURED_CROPS.map((crop) => (
              <li key={crop}>
                <Link
                  href={`/produce/${encodeURIComponent(crop)}`}
                  className="glass-card rounded-xl px-3 py-2 text-body-sm font-medium text-on-surface hover:bg-white/75 transition-colors block text-center"
                >
                  {crop}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </section>
  )
}
