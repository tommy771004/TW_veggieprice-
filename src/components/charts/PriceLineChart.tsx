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
        <div className="text-label-sm text-on-surface mt-1 space-y-0.5">
          <div>上價 ${point.upperPrice.toFixed(1)}</div>
          <div className="text-on-surface-variant">
            下價 ${point.lowerPrice?.toFixed(1)}
          </div>
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

export function PriceLineChart({ data, closedDays = [], height = 180, showPriceRange = false }: PriceLineChartProps) {
  const ticks = selectTicks(data)

  const hasRangeData = data.some((d) => d.upperPrice != null && d.lowerPrice != null)

  const validPrices = data.map((d) => d.avgPrice).filter((p): p is number => p !== null)
  const avgLine = validPrices.length
    ? Math.round(validPrices.reduce((s, p) => s + p, 0) / validPrices.length * 10) / 10
    : null

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

    </div>
  )
}
