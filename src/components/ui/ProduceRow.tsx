import Link from 'next/link'
import { memo } from 'react'
import { TrendChip } from './TrendChip'
import { formatPrice, formatVolume } from '@/lib/utils'
import type { ProducePrice } from '@/lib/types'

interface ProduceRowProps {
  item: ProducePrice & { priceChange?: number; emoji?: string }
  showDetails?: boolean
}

export const ProduceRow = memo(function ProduceRow({ item, showDetails = false }: ProduceRowProps) {
  const emoji = item.emoji || '🌿'
  const change = item.priceChange ?? 0

  return (
    <Link
      href={`/produce/${encodeURIComponent(item.cropName)}`}
      prefetch={false}
      className="group glass-card rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-white/90 dark:hover:bg-zinc-800/50 transition-all duration-300 relative overflow-hidden block"
    >
      <div className="flex items-center gap-4 relative z-10 w-full overflow-hidden">
        <div className="w-14 h-14 bg-white/80 border border-white rounded-full flex items-center justify-center text-2xl shadow-sm shrink-0 group-hover:scale-105 transition-transform duration-300">
          {emoji}
        </div>
        <div className="flex flex-col justify-center flex-grow min-w-0 pr-2">
          <h3 className="text-headline-md font-semibold text-on-surface leading-tight truncate">{item.cropName}</h3>
          <p className="text-body-sm text-on-surface-variant flex items-center gap-1 mt-1 opacity-90 truncate">
            <span className="material-symbols-outlined text-sm opacity-70 shrink-0">storefront</span>
            <span className="truncate">{item.marketName}</span>
            <span className="mx-0.5 opacity-50 shrink-0">·</span>
            <span className="material-symbols-outlined text-sm opacity-70 shrink-0">monitor_weight</span>
            <span className="truncate">{formatVolume(item.transWeight)}</span>
          </p>
          {showDetails && (
            <p className="hidden md:block text-xs text-on-surface-variant mt-0.5 opacity-80 truncate">
              上 ${formatPrice(item.upperPrice)} ／ 中 ${formatPrice(item.middlePrice)} ／ 下 ${formatPrice(item.lowerPrice)}
            </p>
          )}
        </div>
        <div className="text-right flex flex-col items-end shrink-0 relative z-10 ml-auto border-l border-outline-variant/20 pl-4">
          <div className="text-headline-lg font-bold text-primary tracking-tight mb-1">
            ${formatPrice(item.avgPrice)}
          </div>
          <div className="flex justify-end">
            <TrendChip change={change} size="sm" />
          </div>
        </div>
      </div>
    </Link>
  )
})
