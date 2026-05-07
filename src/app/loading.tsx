import { SkeletonCard, SkeletonList } from '@/components/ui/SkeletonCard'

export default function HomeLoading() {
  return (
    <div className="px-section-margin py-6 space-y-section-margin">
      {/* Hero skeleton */}
      <section>
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-2">
            <div className="skeleton h-6 w-36 rounded-lg" />
            <div className="skeleton h-4 w-48 rounded-md" />
          </div>
          <div className="skeleton h-9 w-28 rounded-full" />
        </div>
        <div className="home-hero-card rounded-3xl p-6 animate-pulse">
          <div className="h-3 w-28 rounded-full mb-5" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="h-14 w-44 rounded-xl mb-6" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <div className="h-9 w-full rounded-lg" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>
      </section>

      {/* Category chips skeleton */}
      <div className="flex gap-2">
        {[80, 72, 72, 64].map((w, i) => (
          <div key={i} className={`skeleton h-10 rounded-full`} style={{ width: `${w}px` }} />
        ))}
      </div>

      {/* Movers skeleton */}
      <section>
        <div className="skeleton h-6 w-28 rounded-lg mb-4" />
        <SkeletonList count={5} />
      </section>

      {/* Livestock skeleton */}
      <section>
        <div className="skeleton h-6 w-28 rounded-lg mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    </div>
  )
}
