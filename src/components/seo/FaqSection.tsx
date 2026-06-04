export type FaqItem = { q: string; a: string }

/**
 * Renders a visible FAQ accordion plus a matching FAQPage JSON-LD block.
 *
 * Both come from the same `items` array so the structured data text is always
 * present on the page (Google FAQ policy) and gives AI search engines
 * answer-first, extractable content — the strongest GEO signal for these pages.
 */
export function FaqSection({
  heading,
  items,
  url,
}: {
  heading: string
  items: FaqItem[]
  url: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: 'zh-TW',
    url,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <section className="px-section-margin max-w-3xl mx-auto py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h2 className="text-headline-md font-bold text-on-surface mb-4">{heading}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <details key={item.q} className="glass-card-solid rounded-2xl p-4 md:p-5 group">
            <summary className="text-body-lg font-semibold text-on-surface cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3">
              {item.q}
              <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">
                expand_more
              </span>
            </summary>
            <p className="text-body-md text-on-surface-variant mt-3 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
