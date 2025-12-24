'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react"
import { createOperator } from "@/app/actions/operators"
import { useRouter } from "next/navigation"

export function CreateOperatorDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const res = await createOperator(formData)
    
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
            <Plus className="h-4 w-4" /> Add Operator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Register New Operator</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="grid gap-2">
                <Label>First Name</Label>
                <Input name="first_name" required />
             </div>
             <div className="grid gap-2">
                <Label>Last Name</Label>
                <Input name="last_name" required />
             </div>
          </div>
          
          <div className="grid gap-2">
            <Label>Designation</Label>
            <Input name="designation" defaultValue="Heavy Equipment Operator" />
          </div>
          <div className="grid gap-2">
            <Label>Mobile Number</Label>
            <Input name="phone" required placeholder="+91 9876543210" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-2">
            <div className="grid gap-2">
                <Label>License Number</Label>
                <Input name="license_number" required placeholder="DL-123456789" />
            </div>
            <div className="grid gap-2">
                <Label>License Expiry</Label>
                <Input name="license_expiry" type="date" required />
            </div>
          </div>
          
          <Button type="submit" disabled={loading} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Record
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

