import { SkeletonList } from '@/components/ui/SkeletonCard'

export default function SearchLoading() {
  return (
    <div className="px-section-margin py-6 max-w-3xl mx-auto space-y-4">
      {/* Search bar skeleton */}
      <div className="skeleton h-12 w-full rounded-full" />
      {/* Filter chips skeleton */}
      <div className="flex gap-2 flex-wrap">
        {[64, 80, 72, 96, 64].map((w, i) => (
          <div key={i} className="skeleton h-9 rounded-full" style={{ width: `${w}px` }} />
        ))}
      </div>
      {/* Results skeleton */}
      <SkeletonList count={8} />
    </div>
  )
}
