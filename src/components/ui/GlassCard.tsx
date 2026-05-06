import { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  solid?: boolean
  rounded?: 'lg' | '2xl' | '3xl'
}

export function GlassCard({ solid, rounded = '2xl', className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        solid ? 'glass-card-solid' : 'glass-card',
        rounded === 'lg' ? 'rounded-lg' : rounded === '2xl' ? 'rounded-2xl' : 'rounded-3xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
