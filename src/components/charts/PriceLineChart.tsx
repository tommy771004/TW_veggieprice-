'use client'

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
import { useId } from 'react'
import type { PriceHistoryPoint } from '@/lib/types'

interface PriceLineChartProps {
  data:             PriceHistoryPoint[]
  closedDays?:      string[]
  height?:          number
  showPriceRange?:  boolean
  ariaLabel?:       string
}

interface TooltipPayload {
  value:   number | null
  payload: PriceHistoryPoint
}

function VolumeRow({ volume }: { volume: number | null }) {
  if (volume == null) return null

  return (
    <div className="mt-2 flex items-center justify-between gap-4 border-t border-outline-variant/20 pt-2">
      <span className="text-on-surface-variant text-label-sm">成交量</span>
      <span className="text-on-surface font-semibold tabular-nums">
        {volume.toLocaleString()} 公斤
      </span>
    </div>
  )
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
        <VolumeRow volume={point.volume} />
      </div>
    )
  }

  return (
    <div className="glass-card-solid rounded-xl px-3 py-2 text-sm shadow-glass-sm">
      <p className="text-on-surface-variant text-xs mb-1">{formattedDate}</p>
      <p className="text-primary dark:text-primary-fixed font-bold text-base">${point.avgPrice?.toFixed(1)}</p>
      {point.upperPrice != null && (
        <div className="text-label-sm text-on-surface mt-1 space-y-0.5">
          <div>上價 ${point.upperPrice.toFixed(1)}</div>
          <div className="text-on-surface-variant">
            下價 ${point.lowerPrice?.toFixed(1)}
          </div>
        </div>
      )}
      <VolumeRow volume={point.volume} />
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

export function PriceLineChart({
  data,
  closedDays = [],
  height = 180,
  showPriceRange = false,
  ariaLabel = '價格趨勢圖',
}: PriceLineChartProps) {
  const chartId = useId().replace(/:/g, '')
  const titleId = `${chartId}-title`
  const summaryId = `${chartId}-summary`
  const ticks = selectTicks(data)

  const hasRangeData = data.some((d) => d.upperPrice != null && d.lowerPrice != null)

  const validPrices = data.map((d) => d.avgPrice).filter((p): p is number => p !== null)
  const avgLine = validPrices.length
    ? Math.round(validPrices.reduce((s, p) => s + p, 0) / validPrices.length * 10) / 10
    : null

  const firstPrice = validPrices[0]
  const latestPrice = validPrices[validPrices.length - 1]
  const minPrice = validPrices.length ? Math.min(...validPrices) : null
  const maxPrice = validPrices.length ? Math.max(...validPrices) : null
  const summary = validPrices.length
    ? `${ariaLabel}共有 ${data.length} 個觀察點，${firstPrice === latestPrice ? `目前均價為 ${latestPrice.toFixed(1)} 元` : `起始均價 ${firstPrice.toFixed(1)} 元，最新均價 ${latestPrice.toFixed(1)} 元`}；期間最低 ${minPrice?.toFixed(1)} 元，最高 ${maxPrice?.toFixed(1)} 元。${closedDays.length > 0 ? `其中 ${closedDays.length} 天休市或無交易。` : ''}`
    : `${ariaLabel}目前沒有可用的均價資料。`

  return (
    <figure className="relative isolate">
      <figcaption id={titleId} className="sr-only">{ariaLabel}</figcaption>
      <p id={summaryId} className="sr-only">{summary}</p>
      <div role="img" aria-labelledby={titleId} aria-describedby={summaryId}>
        <div className="overflow-x-auto -mx-1">
          <div style={{ minWidth: Math.max(data.length * 6, 300) }}>
            <ResponsiveContainer width="100%" height={height}>
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              >
                <defs>
                  <linearGradient id={`${chartId}-price-gradient`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-price)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--chart-price)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  ticks={ticks}
                  tick={{ fontSize: '0.6875rem', fill: 'var(--chart-axis)' }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fontSize: '0.6875rem', fill: 'var(--chart-axis)' }}
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
                    stroke="var(--chart-axis)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{
                      value: `均 $${avgLine}`,
                      position: 'insideTopRight',
                      fontSize: '0.625rem',
                      fill: 'var(--chart-axis)',
                    }}
                  />
                )}

                {data.map((point, index) => {
                  if (point.isClosed) {
                    return (
                      <ReferenceLine
                        key={`rest-day-${point.date}-${index}`}
                        x={point.label}
                        stroke="var(--chart-closed)"
                        strokeWidth={12}
                      />
                    )
                  }
                  return null
                })}

                <Area
                  type="monotone"
                  dataKey="avgPrice"
                  stroke="var(--chart-price)"
                  strokeWidth={2}
                  fill={`url(#${chartId}-price-gradient)`}
                  dot={false}
                  connectNulls
                  activeDot={{ r: 5, fill: 'var(--chart-price)', strokeWidth: 0 }}
                />

                {showPriceRange && hasRangeData && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="upperPrice"
                      stroke="var(--chart-range-high)"
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
                      stroke="var(--chart-range-low)"
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
          </div>
        </div>
      </div>

      {(closedDays.length > 0 || (showPriceRange && hasRangeData)) && (
        <div className="flex flex-wrap justify-end items-center gap-x-3 gap-y-1 mt-2">
          {showPriceRange && hasRangeData && (
            <>
              <span className="text-label-sm flex items-center gap-1" style={{ color: 'var(--chart-range-high)' }}>
                <span className="inline-block w-4 border-t-2 border-dashed align-middle" style={{ borderColor: 'var(--chart-range-high)' }} />
                上價
              </span>
              <span className="text-label-sm flex items-center gap-1" style={{ color: 'var(--chart-range-low)' }}>
                <span className="inline-block w-4 border-t-2 border-dashed align-middle" style={{ borderColor: 'var(--chart-range-low)' }} />
                下價
              </span>
            </>
          )}
          {closedDays.length > 0 && (
              <span className="text-label-sm text-outline flex items-center gap-1">
                <span className="inline-block w-4 border-t border-dashed align-middle" style={{ borderColor: 'var(--chart-axis)' }} />
              均價線 · 休市日 {closedDays.length} 天（曲線自動跨越）
            </span>
          )}
        </div>
      )}

      <details className="group mt-3 rounded-xl border border-outline-variant/30 bg-surface-container/40 px-3 py-2">
        <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-lg text-label-bold text-on-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/70 focus-visible:ring-offset-2">
          查看每日資料
          <span aria-hidden="true" className="material-symbols-outlined transition-transform group-open:rotate-180" style={{ fontSize: '1.1rem' }}>
            expand_more
          </span>
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-label-sm">
            <caption className="sr-only">{ariaLabel} 的每日資料</caption>
            <thead>
              <tr className="border-b border-outline-variant/40 text-on-surface-variant">
                <th scope="col" className="py-2 pr-3 font-semibold">日期</th>
                <th scope="col" className="py-2 pr-3 font-semibold">均價（元/公斤）</th>
                <th scope="col" className="py-2 pr-3 font-semibold">成交量</th>
                {showPriceRange && hasRangeData && (
                  <>
                    <th scope="col" className="py-2 pr-3 font-semibold">上價</th>
                    <th scope="col" className="py-2 font-semibold">下價</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {data.map((point) => (
                <tr key={point.date}>
                  <th scope="row" className="py-2 pr-3 font-medium text-on-surface whitespace-nowrap">{point.date}</th>
                  <td className="py-2 pr-3 text-on-surface-variant tabular-nums">
                    {point.avgPrice != null ? `$${point.avgPrice.toFixed(1)}` : '休市 / 無交易'}
                  </td>
                  <td className="py-2 pr-3 text-on-surface-variant tabular-nums">
                    {point.volume != null ? `${point.volume.toLocaleString()} 公斤` : '—'}
                  </td>
                  {showPriceRange && hasRangeData && (
                    <>
                      <td className="py-2 pr-3 text-on-surface-variant tabular-nums">{point.upperPrice != null ? `$${point.upperPrice.toFixed(1)}` : '—'}</td>
                      <td className="py-2 text-on-surface-variant tabular-nums">{point.lowerPrice != null ? `$${point.lowerPrice.toFixed(1)}` : '—'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
