'use client'

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { createBooking } from "@/app/actions/bookings"
import { searchCustomers } from "@/app/actions/invoices"
import { getProjects } from "@/app/actions/projects"
import { useRouter } from "next/navigation"

export function CreateBookingDialog({ 
  itemCode, 
  itemName, 
  defaultRate = 1000,
  available = true 
}: { 
  itemCode: string
  itemName: string
  defaultRate?: number
  available?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [projects, setProjects] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const [customerResults, projectResults] = await Promise.all([
        searchCustomers(''),
        getProjects()
      ])
      setCustomers(customerResults)
      setProjects(projectResults)
    }
    if (open) {
      fetchData()
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    formData.append('item_code', itemCode)
    formData.append('customer', selectedCustomer)
    if (selectedProject) {
      formData.append('project_name', selectedProject)
    }
    
    const res = await createBooking(formData)
    
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
        <Button className="gap-2 w-full" disabled={!available}>
          <Plus className="h-4 w-4" /> {available ? 'Book Now' : 'Out of Stock'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book {itemName}</DialogTitle>
          <DialogDescription>
            Create a rental booking for this item. Rate: ₹{defaultRate.toLocaleString('en-IN')}/day
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Customer Selection */}
          <div className="grid gap-2">
            <Label>Customer *</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer} required>
              <SelectTrigger>
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.length === 0 ? (
                  <div className="p-2 text-sm text-slate-500">No customers found</div>
                ) : (
                  customers.map((customer) => (
                    <SelectItem key={customer.name} value={customer.name}>
                      {customer.customer_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Rental Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Start Date *</Label>
                <Input name="start_date" type="date" required />
            </div>
            <div className="grid gap-2">
                <Label>End Date *</Label>
                <Input name="end_date" type="date" required />
            </div>
          </div>

          {/* Rate */}
          <div className="grid gap-2">
            <Label>Daily Rate (₹) *</Label>
            <Input name="rate" type="number" defaultValue={defaultRate} required />
          </div>

          {/* Project Reference (Optional) */}
          <div className="grid gap-2">
            <Label>Project (Optional)</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <div className="p-2 text-sm text-slate-500">No projects found</div>
                ) : (
                  projects.map((project) => (
                    <SelectItem key={project.name} value={project.name}>
                      {project.project_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedProject && <input type="hidden" name="project_name" value={selectedProject} />}
          </div>
          
          <Button type="submit" disabled={loading || !selectedCustomer} className="mt-2 w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Booking
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
