import { SkeletonCard } from '@/components/ui/SkeletonCard'

export default function ProduceLoading() {
  return (
    <div className="px-section-margin py-6 max-w-3xl mx-auto space-y-4">
      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-4 w-64 rounded-md" />
      </div>
      {/* Price overview skeleton */}
      <div className="home-hero-card rounded-3xl p-6 animate-pulse">
        <div className="h-3 w-28 rounded-full mb-5" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <div className="h-14 w-44 rounded-xl mb-6" style={{ background: 'rgba(255,255,255,0.12)' }} />
        <div className="h-9 w-full rounded-lg" style={{ background: 'rgba(255,255,255,0.07)' }} />
      </div>
      {/* Market list skeleton */}
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}
