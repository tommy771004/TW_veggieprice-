export default function SeasonalLoading() {
  return (
    <div className="px-section-margin py-6 max-w-3xl mx-auto space-y-4">
      <div className="space-y-2">
        <div className="skeleton h-8 w-40 rounded-xl" />
        <div className="skeleton h-4 w-56 rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card rounded-3xl p-5 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-5 w-24 rounded-md" />
                <div className="skeleton h-4 w-full rounded-md" />
                <div className="skeleton h-4 w-3/4 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
