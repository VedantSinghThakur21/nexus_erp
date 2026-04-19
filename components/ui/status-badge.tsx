import { cn } from "@/lib/utils"

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  replied: { label: "Replied", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  opportunity: { label: "Opportunity", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  interested: { label: "Interested", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  converted: { label: "Converted", className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
  lost: { label: "Lost", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  draft: { label: "Draft", className: "bg-slate-500/10 text-slate-600  border-slate-500/20" },
  submitted: { label: "Submitted", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  paid: { label: "Paid", className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
  overdue: { label: "Overdue", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  cancelled: { label: "Cancelled", className: "bg-slate-500/10 text-muted-foreground  border-slate-500/20 line-through" },
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  "in progress": { label: "In progress", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase()
  const config = STATUS_MAP[key] ?? {
    label: status,
    className: "bg-slate-500/10 text-slate-600  border-slate-500/20",
  }

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  )
}
