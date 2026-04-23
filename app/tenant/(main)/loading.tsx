export default function TenantMainLoading() {
  return (
    <div className="app-shell flex flex-col">
      {/* Header placeholder (matches PageHeader height) */}
      <div className="sticky top-0 z-20 h-14 border-b border-border bg-background/95" />

      <div className="app-content">
        <div className="app-container space-y-6">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-muted/80" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

