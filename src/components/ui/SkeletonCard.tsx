export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-card rounded-2xl p-5 ${className}`}>
      <div className="skeleton h-4 w-1/3 mb-3" />
      <div className="skeleton h-8 w-1/2 mb-2" />
      <div className="skeleton h-4 w-2/3" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="glass-card rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-3 w-14" />
        </div>
      </div>
      <div className="text-right space-y-2">
        <div className="skeleton h-5 w-14" />
        <div className="skeleton h-4 w-12 ml-auto" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 5, className = 'space-y-3' }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
