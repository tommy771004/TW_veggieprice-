import { formatChange } from '@/lib/utils'

interface TrendChipProps {
  change: number
  size?: 'sm' | 'md'
}

export function TrendChip({ change, size = 'md' }: TrendChipProps) {
  const isUp = change > 0
  const isFlat = change === 0

  const cls = isFlat ? 'trend-flat' : isUp ? 'trend-up' : 'trend-down'
  const icon = isFlat ? 'horizontal_rule' : isUp ? 'arrow_upward' : 'arrow_downward'

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold ${cls} ${
        size === 'sm' ? 'text-label-sm' : 'text-xs'
      }`}
    >
      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: size === 'sm' ? '0.75rem' : '0.875rem' }}>
        {icon}
      </span>
      {formatChange(change)}
    </span>
  )
}
