'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'

type IntentLinkProps = Omit<ComponentProps<typeof Link>, 'prefetch' | 'href'> & { href: string }

/**
 * A Link that prefetches on intent (hover, touch, keyboard focus) instead of
 * when it scrolls into view.
 *
 * Site-wide links (bottom nav, footer) render on every page, so viewport
 * prefetching fetched every tab's RSC payload on every page view, and each
 * fetch counted as a Vercel edge request. Prefetching on touchstart still
 * gives the payload a head start of roughly 100 ms before the click fires.
 * The href stays in the HTML, so crawlers see the same links.
 */
export function IntentLink({ href, onMouseEnter, onTouchStart, onFocus, ...rest }: IntentLinkProps) {
  const router = useRouter()
  const prefetch = () => router.prefetch(href)

  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      onMouseEnter={(event) => {
        onMouseEnter?.(event)
        prefetch()
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event)
        prefetch()
      }}
      onFocus={(event) => {
        onFocus?.(event)
        prefetch()
      }}
    />
  )
}
