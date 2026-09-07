import Link from 'next/link'
import { memo } from 'react'
import { QuoteRow } from './QuoteRow'
import { formatPrice, formatVolume } from '@/lib/utils'
import { getPriceUnit } from '@/lib/priceUnit'
import type { ProducePrice } from '@/lib/types'
import type { ProduceCategory } from '@/lib/produceCategory'

interface ProduceRowProps {
  item: ProducePrice & { priceChange?: number; emoji?: string }
  category: ProduceCategory
  showDetails?: boolean
}

export const ProduceRow = memo(function ProduceRow({ item, category, showDetails = false }: ProduceRowProps) {
  return (
    <Link href={`/produce/${encodeURIComponent(item.cropName)}`} prefetch={false}
      className="quote-link" data-testid="produce-row" data-crop-name={item.cropName}>
      <QuoteRow name={item.cropName} code={item.cropCode} category={category}
        subtitle={item.marketName} price={item.avgPrice} change={item.priceChange}
        unit={category === 'flower' ? '元' : getPriceUnit(item.cropName, category)}
        details={showDetails ? <>上 {formatPrice(item.upperPrice)} · 中 {formatPrice(item.middlePrice)} · 下 {formatPrice(item.lowerPrice)}</> : undefined}
        meta={<><time dateTime={item.date}>{item.date.replaceAll('-', '/')}</time><span>交易量 {formatVolume(item.transWeight)}</span></>} />
    </Link>
  )
})
