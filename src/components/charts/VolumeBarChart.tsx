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
import type { PriceHistoryPoint } from '@/lib/types'

interface VolumeBarChartProps {
  data: PriceHistoryPoint[]
  height?: number
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
        <p className="text-on-surface-variant text-[0.75rem]">{label}</p>
        <p className="text-outline font-medium mt-0.5">休市日</p>
      </div>
    )
  }

  const vol = payload[0].value
  const display = vol >= 1000 ? `${(vol / 1000).toFixed(1)} 公噸` : `${vol} 公斤`
  return (
    <div className="glass-card-solid rounded-xl px-3 py-2 text-sm shadow-lg">
      <p className="text-on-surface-variant text-[0.75rem]">{label}</p>
      <p className="text-primary-container font-bold">{display}</p>
    </div>
  )
}

export function VolumeBarChart({ data, height = 120 }: VolumeBarChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    volumeValue: point.volume ?? 0,
  }))
  const maxVol = Math.max(0, ...chartData.map((point) => point.volumeValue))
  const lastIdx = data.length - 1

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={data.length > 20 ? 4 : 14}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(112,122,108,0.15)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: '0.6875rem', fill: '#707a6c' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: '0.6875rem', fill: '#707a6c' }} axisLine={false} tickLine={false} hide />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="volumeValue" radius={[4, 4, 0, 0]}>
          {chartData.map((point, index) => (
            <Cell
              key={index}
              fill={index === lastIdx ? '#2e7d32' : '#88d982'}
              opacity={maxVol > 0 ? 0.6 + (point.volumeValue / maxVol) * 0.4 : 0.6}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
