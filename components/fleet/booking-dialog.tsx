'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar, Loader2 } from "lucide-react"
import { bookMachine } from "@/app/actions/fleet"
import { useRouter } from "next/navigation"

export function BookingDialog({ asset }: { asset: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    // Append hidden data
    formData.append('asset_id', asset.name)
    formData.append('item_code', asset.item_code)
    
    const res = await bookMachine(formData)
    
    if (res.success) {
      setOpen(false)
      alert("Booking Created Successfully!")
      router.refresh()
    } else {
      alert("Error: " + res.error)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* FIX: Added w-full, h-8, text-xs to match the card design and prevent layout shift */}
        <Button 
            className="w-full h-8 text-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
            onClick={(e) => e.stopPropagation()} // Prevent triggering parent click if inside a card
        >
            Book Machine
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book {asset.name}</DialogTitle>
          <DialogDescription>
            Create a rental order for this machine.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Customer</Label>
            <Input name="customer" placeholder="e.g. Acme Corp" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input name="start_date" type="date" required />
            </div>
            <div className="grid gap-2">
                <Label>End Date</Label>
                <Input name="end_date" type="date" required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Daily Rate ($)</Label>
            <Input name="rate" type="number" defaultValue="1000" required />
          </div>
          
          <Button type="submit" disabled={loading} className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Booking
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
