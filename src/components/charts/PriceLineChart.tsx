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
import type { PriceHistoryPoint } from '@/lib/types'

interface PriceLineChartProps {
  data:        PriceHistoryPoint[]
  closedDays?: string[]
  height?:     number
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

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

  if (point.isClosed) {
    return (
      <div className="glass-card-solid rounded-xl px-3 py-2.5 text-sm shadow-glass-sm">
        <p className="text-on-surface-variant text-[0.75rem] mb-1">{label}</p>
        <div className="inline-flex items-center gap-1.5 bg-outline-variant/20 border border-outline-variant/40 text-on-surface-variant text-[0.6875rem] px-2.5 py-0.5 rounded-full font-medium mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/80" />
          休市 / 無交易日
        </div>
        {point.avgPrice != null && (
          <div className="border-t border-outline-variant/10 pt-1.5 mt-1">
            <p className="text-on-surface-variant text-[0.6875rem]">估算均價 (插值結果)</p>
            <p className="text-on-surface-variant font-semibold text-sm mt-0.5">${point.avgPrice.toFixed(1)}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="glass-card-solid rounded-xl px-3 py-2 text-sm shadow-glass-sm">
      <p className="text-on-surface-variant text-[0.75rem] mb-1">{label}</p>
      <p className="text-primary font-bold text-base">${point.avgPrice?.toFixed(1)}</p>
      {point.upperPrice != null && (
        <div className="text-[0.6875rem] text-on-surface-variant mt-1 space-y-0.5">
          <div>上價 ${point.upperPrice.toFixed(1)}</div>
          <div>下價 ${point.lowerPrice?.toFixed(1)}</div>
        </div>
      )}
    </div>
  )
}

// ─── Tick selection helper ────────────────────────────────────────────────────

function selectTicks(data: PriceHistoryPoint[]): string[] {
  if (data.length <= 7) return data.map((d) => d.label)
  // Show start, mid, end
  return [
    data[0]?.label,
    data[Math.floor(data.length / 2)]?.label,
    data[data.length - 1]?.label,
  ].filter(Boolean) as string[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PriceLineChart({ data, closedDays = [], height = 180 }: PriceLineChartProps) {
  const ticks = selectTicks(data)

  // Find the average price to draw a reference line
  const validPrices = data.map((d) => d.avgPrice).filter((p): p is number => p !== null)
  const avgLine = validPrices.length
    ? Math.round(validPrices.reduce((s, p) => s + p, 0) / validPrices.length * 10) / 10
    : null

  return (
    <div className="overflow-x-auto -mx-1">
      <div style={{ minWidth: Math.max(data.length * 6, 300) }}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2e7d32" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2e7d32" stopOpacity={0}    />
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

            {/* Average price reference line */}
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

            {/* Subtle vertical bars indicating closed/rest days */}
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

            {/* connectNulls bridges across closed-market days (Part 2 Stage 3) */}
            <Area
              type="monotone"
              dataKey="avgPrice"
              stroke="#0d631b"
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              connectNulls
              activeDot={{ r: 5, fill: '#0d631b', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Closed day legend (only show when there are closed days) */}
      {closedDays.length > 0 && (
        <p className="text-[0.6875rem] text-outline mt-2 text-right">
          <span className="inline-block w-3 border-t border-dashed border-outline mr-1 align-middle" />
          均價線 · 休市日 {closedDays.length} 天（曲線自動跨越）
        </p>
      )}
    </div>
  )
}
