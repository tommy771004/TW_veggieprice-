'use client'

import { forwardRef, type ElementType } from 'react'
import { cn } from '@/lib/cn'
import { m, type HTMLMotionProps } from 'framer-motion'

export interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children" | "className"> {
  solid?: boolean
  rounded?: 'lg' | '2xl' | '3xl'
  children?: React.ReactNode
  className?: string
  interactive?: boolean
  as?: ElementType
  href?: string
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { solid, rounded = '2xl', className, children, interactive, as, href, ...props },
  ref
) {
  const isInteractive = interactive ?? (!!props.onClick || !!href || as === 'button' || as === 'a')
  
  const interactProps = isInteractive ? {
    whileHover: { 
      filter: 'brightness(1.02)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
      y: -1
    },
    whileTap: { scale: 0.97 },
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  } : {}

  // Since we are inside LazyMotion strict, we must use m elements.
  const Component = as === 'button' ? m.button : as === 'a' ? m.a : m.div

  return (
    <Component
      ref={ref as any}
      href={href as any}
      {...interactProps}
      className={cn(
        solid ? 'glass-card-solid' : 'glass-card',
        rounded === 'lg' ? 'rounded-lg' : rounded === '2xl' ? 'rounded-2xl' : 'rounded-3xl',
        isInteractive && 'cursor-pointer touch-manipulation',
         className
      )}
      {...(props as any)}
    >
      {children}
    </Component>
  )
})

GlassCard.displayName = 'GlassCard'
