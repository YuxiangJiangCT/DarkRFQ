export function SkeletonBar({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gradient-to-r from-surface-hover via-border to-surface-hover bg-[length:200%_100%] animate-shimmer rounded ${className}`} />
  )
}

export function SkeletonCard({ index = 0 }: { index?: number }) {
  return (
    <div
      className="bg-surface border border-border rounded-xl p-5 animate-card-enter"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-center justify-between mb-3">
        <SkeletonBar className="h-5 w-40" />
        <SkeletonBar className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        <SkeletonBar className="h-4 w-10" />
        <SkeletonBar className="h-4 w-16" />
        <SkeletonBar className="h-4 w-20" />
        <div className="ml-auto"><SkeletonBar className="h-4 w-14" /></div>
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <SkeletonBar className="h-3 w-48" />
      </div>
    </div>
  )
}

export function SkeletonDetail() {
  return (
    <div>
      <SkeletonBar className="h-4 w-12 mb-4" />
      <div className="flex items-center gap-3 mb-6">
        <SkeletonBar className="h-6 w-48" />
        <SkeletonBar className="h-5 w-10" />
        <SkeletonBar className="h-5 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-3">
          <SkeletonBar className="h-4 w-16 mb-4" />
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <SkeletonBar className="h-4 w-20" />
              <SkeletonBar className="h-4 w-28" />
            </div>
          ))}
        </div>
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-3">
          <SkeletonBar className="h-4 w-24 mb-4" />
          <SkeletonBar className="h-10 w-full rounded-lg" />
          <SkeletonBar className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
