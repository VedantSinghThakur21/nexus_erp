import { cn } from "@/lib/utils"

/**
 * Table-shaped skeleton for list pages (CRM, invoices, bookings, catalogue).
 */
export function ListViewSkeleton({
  titleWidthClass = "w-48",
  rows = 8,
  className,
}: {
  titleWidthClass?: string
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("app-shell flex flex-col", className)}>
      <div className="sticky top-0 z-20 h-14 border-b border-border bg-background/95 backdrop-blur" />
      <div className="app-content">
        <div className="app-container space-y-6 pt-6">
          <div className={cn("h-10 animate-pulse rounded-lg bg-muted/80", titleWidthClass)} />
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid gap-px bg-border">
              <div className="grid grid-cols-12 bg-muted/30 px-4 py-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={cn("h-4 animate-pulse rounded bg-muted/70", i === 0 ? "col-span-4" : "col-span-2")} />
                ))}
              </div>
              {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="grid grid-cols-12 items-center bg-background px-4 py-3 gap-4">
                  <div className="col-span-4 h-4 animate-pulse rounded bg-muted/60" />
                  <div className="col-span-2 h-4 animate-pulse rounded bg-muted/50" />
                  <div className="col-span-2 h-4 animate-pulse rounded bg-muted/50" />
                  <div className="col-span-2 ml-auto h-8 w-20 animate-pulse rounded-md bg-muted/50" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
