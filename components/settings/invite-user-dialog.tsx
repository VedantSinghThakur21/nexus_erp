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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { inviteUser } from "@/app/actions/settings"
import { useRouter } from "next/navigation"

export function InviteUserDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('Sales User')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const res = await inviteUser(formData)
    
    if (res.success) {
      setOpen(false)
      alert("User Created! Default password is usually '123456' or sent via email.")
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
            <Plus className="h-4 w-4" /> Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
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
            <Label>Email</Label>
            <Input name="email" type="email" required />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Sales User">Sales Person</SelectItem>
                    <SelectItem value="Accounts User">Accountant</SelectItem>
                    <SelectItem value="Stock User">Yard Manager</SelectItem>
                    <SelectItem value="System Manager">Admin</SelectItem>
                </SelectContent>
            </Select>
            <input type="hidden" name="role" value={role} />
          </div>
          
          <Button type="submit" disabled={loading} className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invite
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

