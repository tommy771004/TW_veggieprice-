'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { getMarqueeOffers, type ResolvedOffer } from '@/lib/affiliates'
import { trackEvent } from '@/lib/analytics'

type Props = {
  /** 跑馬燈標題。 */
  title?: string
  /** 滾動一輪的「每張秒數」,數字越大越慢。 */
  secondsPerItem?: number
  className?: string
  /** 版位來源標記,寫入 audit metadata(例:home / search)。 */
  placement?: string
}

const MASK = 'linear-gradient(to right, transparent, black 4%, black 96%, transparent)'

/**
 * 首頁／搜尋頁的聯盟推廣「跑馬燈」(連續水平捲動)。
 * - 不分作物,顯示所有啟用中的商家(來自 src/lib/affiliates.ts)。
 * - 滑入/聚焦會暫停;尊重 prefers-reduced-motion(改為可手動橫向捲動)。
 * - 進入可視範圍記一次 affiliate_impression、點擊記 affiliate_click(placement 由呼叫端帶入,如 home/search)。
 */
export function AffiliateMarquee({
  title = '合作推薦',
  secondsPerItem = 3.6,
  className,
  placement = 'marquee',
}: Props) {
  const offers = useMemo(() => getMarqueeOffers(), [])
  const reduceMotion = useReducedMotion() ?? false
  const containerRef = useRef<HTMLDivElement>(null)
  const seenRef = useRef<Set<string>>(new Set())
  const [paused, setPaused] = useState(false)

  // 進入可視範圍時,為每個商家記一次曝光(跑馬燈會把所有商家輪播過)。
  useEffect(() => {
    if (offers.length === 0) return
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        for (const offer of offers) {
          if (seenRef.current.has(offer.id)) continue
          seenRef.current.add(offer.id)
          trackEvent('affiliate_impression', offer.id, {
            sponsored: offer.sponsored,
            partner: offer.partner,
            placement,
          })
        }
        io.disconnect()
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [offers, placement])

  if (offers.length === 0) return null

  const duration = Math.max(24, offers.length * secondsPerItem)
  // 動畫版需要把清單渲染兩份才能無縫接續;reduce-motion 版只渲染一份並可手動捲動。
  const rendered = reduceMotion ? offers : [...offers, ...offers]

  function handleClick(offer: ResolvedOffer) {
    trackEvent('affiliate_click', offer.id, {
      sponsored: offer.sponsored,
      partner: offer.partner,
      placement,
    })
  }

  return (
    <section aria-label="合作推薦服務" className={className}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="section-kicker">{title}</span>
        <a
          href="/privacy#disclosure"
          className="text-2xs text-outline hover:text-on-surface-variant transition-colors"
        >
          含推廣連結
        </a>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-outline/15 bg-surface/60 backdrop-blur-md py-2.5 shadow-glass-sm"
        style={{ WebkitMaskImage: MASK, maskImage: MASK }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div
          className={
            reduceMotion ? 'flex gap-3 overflow-x-auto px-3 no-scrollbar' : 'flex w-max'
          }
          style={
            reduceMotion
              ? undefined
              : {
                  animation: `vp-marquee ${duration}s linear infinite`,
                  animationPlayState: paused ? 'paused' : 'running',
                }
          }
        >
          {rendered.map((offer, i) => {
            const isClone = !reduceMotion && i >= offers.length
            return (
              <a
                key={`${offer.id}-${i}`}
                href={offer.href}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                onClick={() => handleClick(offer)}
                aria-hidden={isClone}
                tabIndex={isClone ? -1 : 0}
                className={`${reduceMotion ? '' : 'mr-3'} shrink-0 inline-flex items-center gap-2 rounded-full bg-white/70 border border-white/50 px-4 py-2 whitespace-nowrap hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
              >
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: '1.1rem' }}
                  aria-hidden="true"
                >
                  {offer.icon ?? 'storefront'}
                </span>
                <span className="text-label-bold text-on-surface">{offer.partner ?? offer.title}</span>
                {offer.sponsored && (
                  <span className="text-2xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                    贊助
                  </span>
                )}
                <span
                  className="material-symbols-outlined text-outline"
                  style={{ fontSize: '0.95rem' }}
                  aria-hidden="true"
                >
                  arrow_outward
                </span>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
