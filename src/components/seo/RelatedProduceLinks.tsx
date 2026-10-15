import Link from 'next/link'
import { COMMON_CROPS } from '@/lib/crops'
import { getProduceCategory } from '@/lib/produce'

// Server-rendered sibling links between /produce/[id] pages.
//
// GSC had most produce pages as "discovered, not indexed": their only inbound
// links were the homepage's featured list and the category hubs. Each page now
// links to the next few crops of its category (wrapping around), so every crop
// gets inbound links from its neighbours with descriptive "X價格" anchors.

const LINK_COUNT = 10

export function relatedCrops(cropName: string): string[] {
  const category = getProduceCategory(cropName)
  const siblings = COMMON_CROPS.filter((crop) => getProduceCategory(crop) === category)
  const start = siblings.indexOf(cropName as (typeof COMMON_CROPS)[number])
  const ordered = start === -1 ? siblings : [...siblings.slice(start + 1), ...siblings.slice(0, start)]
  return ordered.filter((crop) => crop !== cropName).slice(0, LINK_COUNT)
}

export function RelatedProduceLinks({ cropName, categoryLabel }: { cropName: string; categoryLabel: string }) {
  const crops = relatedCrops(cropName)
  if (crops.length === 0) return null

  return (
    <section className="px-section-margin max-w-4xl mx-auto py-6" aria-label={`其他${categoryLabel}價格`}>
      <article className="section-shell space-y-3">
        <h2 className="text-headline-md font-bold text-on-surface">其他{categoryLabel}今日價格</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {crops.map((crop) => (
            <li key={crop}>
              <Link
                href={`/produce/${encodeURIComponent(crop)}`}
                className="glass-card rounded-xl px-3 py-2 text-body-sm font-medium text-on-surface hover:bg-white/75 transition-colors block text-center"
              >
                {crop}價格
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </section>
  )
}
