"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { useUser } from "@/contexts/user-context"
import { canPerform } from "@/lib/role-permissions"

interface ActionButtonProps {
  module: string
  action: string
  label: string
  icon?: React.ReactNode
  variant?: "default" | "outline" | "destructive" | "ghost"
  onAction: () => Promise<void>
  onSuccess?: () => void
}

export function ActionButton({
  module,
  action,
  label,
  icon,
  variant = "default",
  onAction,
  onSuccess,
}: ActionButtonProps) {
  const { roles } = useUser()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)

  if (!canPerform(module, action, roles)) return null

  async function handle() {
    setLoading(true)
    try {
      await onAction()
      addToast({ type: "success", title: "Done", message: `${label} completed successfully.` })
      onSuccess?.()
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Failed",
        message: err?.message ?? "Something went wrong.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} size="sm" onClick={handle} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </Button>
  )
}
