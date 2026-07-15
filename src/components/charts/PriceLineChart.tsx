'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { m } from 'framer-motion'
import type { PriceHistoryPoint } from '@/lib/types'

interface PriceLineChartProps {
  data:             PriceHistoryPoint[]
  closedDays?:      string[]
  height?:          number
  showPriceRange?:  boolean
}

interface TooltipPayload {
  value:   number | null
  payload: PriceHistoryPoint
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?:   boolean
  payload?:  TooltipPayload[]
  label?:    string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as PriceHistoryPoint

  const formattedDate = point.date ? (() => {
    const parts = point.date.split('-')
    if (parts.length === 3) {
      return `${parts[0]} 年 ${parts[1]} 月 ${parts[2]} 日`
    }
    return point.date
  })() : label

  if (point.isClosed) {
    return (
      <div className="glass-card-solid rounded-xl px-3 py-2.5 text-sm shadow-glass-sm">
        <p className="text-on-surface-variant text-xs mb-1">{formattedDate}</p>
        <div className="inline-flex items-center gap-1.5 bg-outline-variant/20 border border-outline-variant/40 text-on-surface-variant text-label-sm px-2.5 py-0.5 rounded-full font-medium mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/80" />
          休市 / 無交易日
        </div>
        {point.avgPrice != null && (
          <div className="border-t border-outline-variant/10 pt-1.5 mt-1">
            <p className="text-on-surface-variant text-label-sm">估算均價 (插值結果)</p>
            <p className="text-on-surface-variant font-semibold text-sm mt-0.5">${point.avgPrice.toFixed(1)}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="glass-card-solid rounded-xl px-3 py-2 text-sm shadow-glass-sm">
      <p className="text-on-surface-variant text-xs mb-1">{formattedDate}</p>
      <p className="text-primary font-bold text-base">${point.avgPrice?.toFixed(1)}</p>
      {point.upperPrice != null && (
        <div className="text-label-sm text-on-surface-variant mt-1 space-y-0.5">
          <div>上價 ${point.upperPrice.toFixed(1)}</div>
          <div>下價 ${point.lowerPrice?.toFixed(1)}</div>
        </div>
      )}
    </div>
  )
}

function selectTicks(data: PriceHistoryPoint[]): string[] {
  if (data.length <= 7) return data.map((d) => d.label)
  return [
    data[0]?.label,
    data[Math.floor(data.length / 2)]?.label,
    data[data.length - 1]?.label,
  ].filter(Boolean) as string[]
}

function formatDetailDate(iso: string): string {
  const parts = iso.split('-')
  if (parts.length === 3) {
    return `${parts[0]} 年 ${parseInt(parts[1], 10)} 月 ${parseInt(parts[2], 10)} 日`
  }
  return iso
}

export function PriceLineChart({ data, closedDays = [], height = 180, showPriceRange = false }: PriceLineChartProps) {
  const ticks = selectTicks(data)

  const [detailPoint, setDetailPoint] = useState<PriceHistoryPoint | null>(null)
  const [portalReady, setPortalReady] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeLabelRef = useRef<string | null>(null)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  // Escape to close
  useEffect(() => {
    if (!detailPoint) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailPoint(null)
    }
    window.addEventListener('keydown', onKey)
    // Prevent background scroll while sheet is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [detailPoint])

  const openDetail = (point: PriceHistoryPoint) => {
    setDetailPoint(point)
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      try { window.navigator.vibrate(40) } catch { /* ignore */ }
    }
  }

  const closeDetail = () => setDetailPoint(null)

  const handleInteractionStart = (e: unknown) => {
    const evt = e as { activePayload?: Array<{ payload: PriceHistoryPoint }> } | null
    if (!evt?.activePayload?.length) return
    const point = evt.activePayload[0].payload
    activeLabelRef.current = point.label

    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => {
      openDetail(point)
    }, 400)
  }

  const handleInteractionMove = (e: unknown) => {
    const evt = e as { activePayload?: Array<{ payload: PriceHistoryPoint }> } | null
    if (!evt?.activePayload?.length) return
    const point = evt.activePayload[0].payload

    if (detailPoint) {
      setDetailPoint(point)
      return
    }

    if (activeLabelRef.current !== point.label) {
      if (pressTimer.current) clearTimeout(pressTimer.current)
      activeLabelRef.current = point.label
      pressTimer.current = setTimeout(() => {
        openDetail(point)
      }, 400)
    }
  }

  const handleInteractionEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    activeLabelRef.current = null
  }

  /** Tap / click opens detail immediately (no long-press wait). */
  const handleChartClick = (e: unknown) => {
    const evt = e as { activePayload?: Array<{ payload: PriceHistoryPoint }> } | null
    if (!evt?.activePayload?.length) return
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    openDetail(evt.activePayload[0].payload)
  }

  const hasRangeData = data.some((d) => d.upperPrice != null && d.lowerPrice != null)

  const validPrices = data.map((d) => d.avgPrice).filter((p): p is number => p !== null)
  const avgLine = validPrices.length
    ? Math.round(validPrices.reduce((s, p) => s + p, 0) / validPrices.length * 10) / 10
    : null

  const detailSheet =
    portalReady &&
    detailPoint &&
    createPortal(
      <div
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-detail-title"
      >
        {/* Scrim — click to close, sits above page/chart */}
        <button
          type="button"
          aria-label="關閉行情明細"
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px] border-0 cursor-default"
          onClick={closeDetail}
        />

        {/* Sheet / card */}
        <div
          className="relative z-[1] bg-surface-container-highest dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-[360px] shadow-2xl border border-outline-variant/40 sm:mb-0 mb-0 max-h-[min(80vh,520px)] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-4 gap-3">
            <div className="min-w-0">
              <h3
                id="price-detail-title"
                className="text-lg font-semibold text-on-surface"
              >
                {formatDetailDate(detailPoint.date)} 行情明細
              </h3>
              <p className="text-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <span className="material-symbols-outlined text-base" aria-hidden>
                  calendar_today
                </span>
                {detailPoint.label}
              </p>
            </div>
            <button
              type="button"
              onClick={closeDetail}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors touch-target"
              aria-label="關閉明細"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden>
                close
              </span>
            </button>
          </div>

          {detailPoint.isClosed ? (
            <div className="bg-surface-container p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 mb-2">
              <span className="material-symbols-outlined text-3xl text-outline-variant" aria-hidden>
                event_busy
              </span>
              <div>
                <p className="text-on-surface font-medium">休市 / 無交易日</p>
                <p className="text-on-surface-variant text-sm mt-0.5">當日市場無交易紀錄</p>
              </div>
              {detailPoint.avgPrice != null && (
                <div className="mt-3 w-full border-t border-outline-variant/20 pt-3">
                  <p className="text-on-surface-variant text-sm">圖表延續之估算均價</p>
                  <p className="text-on-surface font-semibold text-lg">
                    ${detailPoint.avgPrice.toFixed(1)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-surface-container p-3 rounded-2xl text-center">
                  <p className="text-on-surface-variant text-label-sm mb-1">上價</p>
                  <p className="text-[#43a047] font-semibold text-base sm:text-lg">
                    {detailPoint.upperPrice != null
                      ? `$${detailPoint.upperPrice.toFixed(1)}`
                      : '—'}
                  </p>
                </div>
                <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-full" />
                  <p className="text-primary text-label-sm mb-1 font-medium">中價</p>
                  <p className="text-primary font-bold text-lg sm:text-xl">
                    {detailPoint.avgPrice != null
                      ? `$${detailPoint.avgPrice.toFixed(1)}`
                      : '—'}
                  </p>
                </div>
                <div className="bg-surface-container p-3 rounded-2xl text-center">
                  <p className="text-on-surface-variant text-label-sm mb-1">下價</p>
                  <p className="text-[#f57c00] font-semibold text-base sm:text-lg">
                    {detailPoint.lowerPrice != null
                      ? `$${detailPoint.lowerPrice.toFixed(1)}`
                      : '—'}
                  </p>
                </div>
              </div>

              {detailPoint.volume != null && (
                <div className="bg-surface-container px-4 py-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-lg" aria-hidden>
                      weight
                    </span>
                    <span className="text-sm font-medium">交易量</span>
                  </div>
                  <p className="text-on-surface font-semibold">
                    {detailPoint.volume.toLocaleString()} 公斤
                  </p>
                </div>
              )}
            </div>
          )}

          <p className="text-center text-label-sm text-outline mt-4">
            點圖表其他日期可切換 · 點外側或 × 關閉
          </p>
        </div>
      </div>,
      document.body,
    )

  return (
    <div className="overflow-x-auto -mx-1 relative isolate">
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ minWidth: Math.max(data.length * 6, 300) }}
      >
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            onMouseDown={handleInteractionStart}
            onMouseMove={handleInteractionMove}
            onMouseUp={handleInteractionEnd}
            onMouseLeave={handleInteractionEnd}
            onClick={handleChartClick}
          >
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1b5e20" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#1b5e20" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(112,122,108,0.15)"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              ticks={ticks}
              tick={{ fontSize: '0.6875rem', fill: '#707a6c' }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fontSize: '0.6875rem', fill: '#707a6c' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
              domain={['auto', 'auto']}
              width={46}
            />

            <Tooltip content={<CustomTooltip />} />

            {avgLine !== null && (
              <ReferenceLine
                y={avgLine}
                stroke="#707a6c"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `均 $${avgLine}`,
                  position: 'insideTopRight',
                  fontSize: '0.625rem',
                  fill: '#707a6c',
                }}
              />
            )}

            {data.map((point, index) => {
              if (point.isClosed) {
                return (
                  <ReferenceLine
                    key={`rest-day-${point.date}-${index}`}
                    x={point.label}
                    stroke="rgba(112, 122, 108, 0.08)"
                    strokeWidth={12}
                  />
                )
              }
              return null
            })}

            <Area
              type="monotone"
              dataKey="avgPrice"
              stroke="#1b5e20"
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              connectNulls
              activeDot={{ r: 5, fill: '#1b5e20', strokeWidth: 0 }}
            />

            {showPriceRange && hasRangeData && (
              <>
                <Area
                  type="monotone"
                  dataKey="upperPrice"
                  stroke="#43a047"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  fillOpacity={0}
                  dot={false}
                  connectNulls
                  activeDot={false}
                />
                <Area
                  type="monotone"
                  dataKey="lowerPrice"
                  stroke="#f57c00"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  fillOpacity={0}
                  dot={false}
                  connectNulls
                  activeDot={false}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </m.div>

      {(closedDays.length > 0 || (showPriceRange && hasRangeData)) && (
        <div className="flex flex-wrap justify-end items-center gap-x-3 gap-y-1 mt-2">
          {showPriceRange && hasRangeData && (
            <>
              <span className="text-label-sm flex items-center gap-1 text-[#43a047]">
                <span className="inline-block w-4 border-t-2 border-dashed border-[#43a047] align-middle" />
                上價
              </span>
              <span className="text-label-sm flex items-center gap-1 text-[#f57c00]">
                <span className="inline-block w-4 border-t-2 border-dashed border-[#f57c00] align-middle" />
                下價
              </span>
            </>
          )}
          {closedDays.length > 0 && (
            <span className="text-label-sm text-outline flex items-center gap-1">
              <span className="inline-block w-4 border-t border-dashed border-outline align-middle" />
              均價線 · 休市日 {closedDays.length} 天（曲線自動跨越）
            </span>
          )}
        </div>
      )}

      {detailSheet}
    </div>
  )
}
