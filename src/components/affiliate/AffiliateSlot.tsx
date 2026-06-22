'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { selectAffiliateOffers, type ResolvedOffer } from '@/lib/affiliates'
import type { ProduceCategory } from '@/lib/produce'
import { trackEvent } from '@/lib/analytics'

type Props = {
  cropName: string
  category: ProduceCategory
  /** 最多顯示幾張卡片（輪播張數）。 */
  limit?: number
  /** 自動輪播間隔（毫秒）。 */
  intervalMs?: number
}

/**
 * 作物詳情頁的「聯盟／贊助」版位，以輪播方式顯示。
 * - 內容由 src/lib/affiliates.ts 設定（資料驅動）。
 * - 自動輪播：滑入/聚焦或按暫停鈕會停；尊重 prefers-reduced-motion。
 * - 點擊記 affiliate_click；每張捲到可視且輪到時記一次 affiliate_impression（算 CTR）。
 */
export function AffiliateSlot({ cropName, category, limit = 6, intervalMs = 5000 }: Props) {
  const offers = useMemo(
    () => selectAffiliateOffers(cropName, category, limit),
    [cropName, category, limit],
  )

  const reduceMotion = useReducedMotion() ?? false
  const containerRef = useRef<HTMLDivElement>(null)
  const seenRef = useRef<Set<string>>(new Set())

  const [activeIndex, setActiveIndex] = useState(0)
  const [userPaused, setUserPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [inView, setInView] = useState(false)

  const count = offers.length
  const canRotate = count > 1
  const paused = userPaused || hovered

  // 作物變更時重置輪播與曝光記錄。
  useEffect(() => {
    setActiveIndex(0)
    seenRef.current.clear()
  }, [offers])

  // 觀察版位是否在可視範圍。
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.5,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // 曝光追蹤：目前這張在可視範圍時記一次（每檔位每次掛載最多一次）。
  useEffect(() => {
    if (!inView || count === 0) return
    const offer = offers[activeIndex]
    if (!offer || seenRef.current.has(offer.id)) return
    seenRef.current.add(offer.id)
    trackEvent('affiliate_impression', offer.id, {
      crop: cropName,
      sponsored: offer.sponsored,
      partner: offer.partner,
      placement: 'detail',
    })
  }, [inView, activeIndex, offers, count, cropName])

  // 自動輪播。
  useEffect(() => {
    if (!canRotate || paused || reduceMotion || !inView) return
    const timer = setInterval(() => setActiveIndex((i) => (i + 1) % count), intervalMs)
    return () => clearInterval(timer)
  }, [canRotate, paused, reduceMotion, inView, count, intervalMs])

  if (count === 0) return null

  const go = (index: number) => setActiveIndex(((index % count) + count) % count)

  function handleClick(offer: ResolvedOffer) {
    trackEvent('affiliate_click', offer.id, {
      crop: cropName,
      sponsored: offer.sponsored,
      partner: offer.partner,
      placement: 'detail',
    })
  }

  return (
    <section className="section-shell">
      <div className="section-heading-row gap-3 mb-5">
        <div>
          <p className="section-kicker">Recommended</p>
          <h2 className="text-headline-md font-semibold text-on-surface">推薦服務</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            為你整理與 {cropName} 相關的延伸服務。本區含推廣／贊助連結，點擊或購買我們可能獲得分潤，詳見
            <a href="/privacy#disclosure" className="text-primary hover:underline">
              揭露說明
            </a>
            。
          </p>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative"
        role="group"
        aria-roledescription="輪播"
        aria-label="推薦服務輪播"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setHovered(true)}
        onBlurCapture={() => setHovered(false)}
      >
        <div className="overflow-hidden rounded-2xl">
          <div
            className="flex"
            style={{
              transform: `translateX(-${activeIndex * 100}%)`,
              transition: reduceMotion ? 'none' : 'transform 500ms ease',
            }}
          >
            {offers.map((offer, i) => {
              const active = i === activeIndex
              return (
                <div
                  key={offer.id}
                  className="w-full flex-shrink-0"
                  role="group"
                  aria-roledescription="幻燈片"
                  aria-label={`${i + 1} / ${count}`}
                  aria-hidden={!active}
                >
                  <a
                    href={offer.href}
                    target="_blank"
                    rel="sponsored nofollow noopener noreferrer"
                    onClick={() => handleClick(offer)}
                    tabIndex={active ? 0 : -1}
                    className="glass-card rounded-2xl px-4 py-3.5 flex items-start gap-3 hover:bg-white/75 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                  >
                    <span
                      className="material-symbols-outlined text-primary mt-0.5 flex-shrink-0"
                      style={{ fontSize: '1.5rem' }}
                      aria-hidden="true"
                    >
                      {offer.icon ?? 'storefront'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-body-md font-semibold text-on-surface">{offer.title}</h3>
                        <span
                          className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${
                            offer.sponsored
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {offer.sponsored ? '贊助' : '合作推薦'}
                        </span>
                      </div>
                      <p className="text-body-sm text-on-surface-variant mt-0.5">{offer.description}</p>
                      <span className="inline-flex items-center gap-1 text-label-bold text-primary mt-2 group-hover:gap-1.5 transition-all">
                        {offer.ctaLabel}
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '1rem' }}
                          aria-hidden="true"
                        >
                          arrow_forward
                        </span>
                      </span>
                      {offer.partner && (
                        <p className="text-2xs text-outline mt-1.5">與 {offer.partner} 合作</p>
                      )}
                    </div>
                  </a>
                </div>
              )
            })}
          </div>
        </div>

        {canRotate && (
          <div className="mt-3 flex items-center justify-between gap-3">
            {/* 指示點 */}
            <div className="flex items-center gap-1.5" role="group" aria-label="選擇推薦">
              {offers.map((offer, i) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`前往第 ${i + 1} 張，共 ${count} 張`}
                  aria-current={i === activeIndex}
                  className={`h-2 rounded-full transition-all ${
                    i === activeIndex ? 'w-5 bg-primary' : 'w-2 bg-outline-variant hover:bg-outline'
                  }`}
                />
              ))}
            </div>

            {/* 控制鈕 */}
            <div className="flex items-center gap-1">
              {!reduceMotion && (
                <button
                  type="button"
                  onClick={() => setUserPaused((p) => !p)}
                  aria-label={userPaused ? '播放自動輪播' : '暫停自動輪播'}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden="true">
                    {userPaused ? 'play_arrow' : 'pause'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => go(activeIndex - 1)}
                aria-label="上一個推薦"
                className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden="true">
                  chevron_left
                </span>
              </button>
              <button
                type="button"
                onClick={() => go(activeIndex + 1)}
                aria-label="下一個推薦"
                className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden="true">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
