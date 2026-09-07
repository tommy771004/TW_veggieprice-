import type { ReactNode } from 'react'
import { IngredientImage } from './IngredientImage'
import { formatPrice } from '@/lib/utils'
import type { ProduceCategory } from '@/lib/produceCategory'

interface QuoteRowProps {
  name: string
  title?: string
  subtitle: ReactNode
  price: number
  change?: number | null
  unit?: string
  category: ProduceCategory
  code?: string
  rank?: number
  details?: ReactNode
  meta?: ReactNode
}

/** Shared visual row; its parent owns the link and list semantics. */
export function QuoteRow({ name, title, subtitle, price, change, unit = '元', category, code, rank, details, meta }: QuoteRowProps) {
  const hasChange = typeof change === 'number' && Number.isFinite(change)
  const direction = !hasChange || change === 0 ? 'flat' : change > 0 ? 'up' : 'down'
  const changeClass = { up: 'quote-change--up', down: 'quote-change--down', flat: 'quote-change--flat' }[direction]
  return (
    <div className="quote-row">
      <div className="quote-product">
        {rank !== undefined && <span className="quote-rank" aria-label={`第 ${rank} 名`}>{String(rank).padStart(2, '0')}</span>}
        <IngredientImage name={name} code={code} category={category} />
        <div className="quote-product-copy">
          <h3 className="quote-name">{title ?? name}</h3>
          <div className="quote-subtitle">{subtitle}</div>
          {details && <div className="quote-details">{details}</div>}
        </div>
      </div>
      <div className="quote-price">
        <span className="sr-only">均價 </span>
        <strong>{formatPrice(price)}</strong>
        <span className="quote-unit">{unit}</span>
      </div>
      <div className={`quote-change ${changeClass}`} data-testid="produce-row-change">
        <span className="quote-change-label">較前次有效報價</span>
        <span className="quote-change-value">
          {hasChange ? <>
            <span aria-hidden="true" className="material-symbols-outlined">{direction === 'up' ? 'arrow_upward' : direction === 'down' ? 'arrow_downward' : 'remove'}</span>
            <span className="sr-only">{direction === 'up' ? '上漲 ' : direction === 'down' ? '下跌 ' : '持平 '}</span>
            {change > 0 ? '+' : change < 0 ? '-' : ''}{Math.abs(change).toFixed(1)}%
          </> : <span className="quote-change-label">尚無比較資料</span>}
        </span>
      </div>
      {meta && <div className="quote-meta">{meta}</div>}
    </div>
  )
}
