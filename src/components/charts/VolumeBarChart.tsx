'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { useId } from 'react'
import type { PriceHistoryPoint } from '@/lib/types'

interface VolumeBarChartProps {
  data: PriceHistoryPoint[]
  height?: number
  ariaLabel?: string
}

interface ChartPoint extends PriceHistoryPoint {
  volumeValue: number
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; payload: ChartPoint }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload

  if (point.isClosed || point.volume == null) {
    return (
      <div className="glass-card-solid rounded-xl px-3 py-2 text-sm shadow-lg text-center">
        <p className="text-on-surface-variant text-xs">{label}</p>
        <p className="text-outline font-medium mt-0.5">休市日</p>
      </div>
    )
  }

  const vol = payload[0].value
  const display = vol >= 1000 ? `${(vol / 1000).toFixed(1)} 公噸` : `${vol} 公斤`
  return (
    <div className="glass-card-solid rounded-xl px-3 py-2 text-sm shadow-lg">
      <p className="text-on-surface-variant text-xs">{label}</p>
    <p className="text-primary-container dark:text-primary-fixed font-bold">{display}</p>
    </div>
  )
}

export function VolumeBarChart({ data, height = 120, ariaLabel = '交易量圖' }: VolumeBarChartProps) {
  const chartId = useId().replace(/:/g, '')
  const titleId = `${chartId}-title`
  const summaryId = `${chartId}-summary`
  const chartData = data.map((point) => ({
    ...point,
    volumeValue: point.volume ?? 0,
  }))
  const maxVol = Math.max(0, ...chartData.map((point) => point.volumeValue))
  const lastIdx = data.length - 1
  const actualVolumes = data.map((point) => point.volume).filter((volume): volume is number => volume != null)
  const latestVolume = [...actualVolumes].pop()
  const summary = actualVolumes.length
    ? `${ariaLabel}共有 ${data.length} 個觀察點，最新可用交易量為 ${latestVolume?.toLocaleString()} 公斤，期間最高為 ${Math.max(...actualVolumes).toLocaleString()} 公斤。`
    : `${ariaLabel}目前沒有可用的交易量資料。`

  return (
    <figure>
      <figcaption id={titleId} className="sr-only">{ariaLabel}</figcaption>
      <p id={summaryId} className="sr-only">{summary}</p>
      <div role="img" aria-labelledby={titleId} aria-describedby={summaryId}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={data.length > 20 ? 4 : 14}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: '0.6875rem', fill: 'var(--chart-axis)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: '0.6875rem', fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="volumeValue" radius={[4, 4, 0, 0]}>
              {chartData.map((point, index) => (
                <Cell
                  key={index}
                  fill={index === lastIdx ? 'var(--chart-volume-current)' : 'var(--chart-volume)'}
                  opacity={maxVol > 0 ? 0.6 + (point.volumeValue / maxVol) * 0.4 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="group mt-3 rounded-xl border border-outline-variant/30 bg-surface-container/40 px-3 py-2">
        <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-lg text-label-bold text-on-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed/70 focus-visible:ring-offset-2">
          查看每日資料
          <span aria-hidden="true" className="material-symbols-outlined transition-transform group-open:rotate-180" style={{ fontSize: '1.1rem' }}>
            expand_more
          </span>
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[18rem] text-left text-label-sm">
            <caption className="sr-only">{ariaLabel} 的每日資料</caption>
            <thead>
              <tr className="border-b border-outline-variant/40 text-on-surface-variant">
                <th scope="col" className="py-2 pr-3 font-semibold">日期</th>
                <th scope="col" className="py-2 font-semibold">交易量</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {data.map((point, index) => (
                <tr key={`${point.date}-${index}`}>
                  <th scope="row" className="py-2 pr-3 font-medium text-on-surface whitespace-nowrap">{point.date}</th>
                  <td className="py-2 text-on-surface-variant tabular-nums">
                    {point.volume != null ? `${point.volume.toLocaleString()} 公斤` : '休市 / 無交易'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
