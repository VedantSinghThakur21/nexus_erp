'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Truck, Loader2 } from "lucide-react"
import { mobilizeAsset } from "@/app/actions/bookings"
import { useRouter } from "next/navigation"

export function MobilizeDialog({ booking, operators }: { booking: any, operators: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const res = await mobilizeAsset(formData)
    
    if (res.success) {
      setOpen(false)
      router.refresh()
    } else {
      alert("Error: " + res.error)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Truck className="h-4 w-4" />
            Mobilize (Send to Site)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mobilize Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
            <input type="hidden" name="booking_id" value={booking.name} />
            
            <div className="grid gap-2">
                <Label>Assign Operator / Driver</Label>
                <Select name="operator" required>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Operator" />
                    </SelectTrigger>
                    <SelectContent>
                        {operators.map((op) => (
                            <SelectItem key={op.name} value={op.employee_name}>
                                {op.employee_name} ({op.designation})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Dispatch
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
