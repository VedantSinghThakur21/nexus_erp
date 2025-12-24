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
import { Calendar, Loader2 } from "lucide-react"
import { bookMachine } from "@/app/actions/fleet"
import { searchCustomers, getInvoices } from "@/app/actions/invoices"
import { useRouter } from "next/navigation"

export function BookingDialog({ asset }: { asset: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchCustomers = async () => {
      const results = await searchCustomers('')
      setCustomers(results)
    }
    if (open) {
      fetchCustomers()
    }
  }, [open])

  // Fetch invoices when customer is selected
  useEffect(() => {
    const fetchCustomerInvoices = async () => {
      if (selectedCustomer) {
        const allInvoices = await getInvoices()
        const filtered = allInvoices.filter((inv: any) => inv.customer_name === selectedCustomer)
        setCustomerInvoices(filtered)
        setSelectedInvoice('') // Reset invoice selection
      } else {
        setCustomerInvoices([])
        setSelectedInvoice('')
      }
    }
    fetchCustomerInvoices()
  }, [selectedCustomer])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    // Append hidden data
    formData.append('asset_id', asset.name)
    formData.append('item_code', asset.item_code)
    formData.append('customer', selectedCustomer)
    if (selectedInvoice) {
      formData.append('invoice_ref', selectedInvoice)
    }
    
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
        <Button 
            className="w-full h-8 text-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
            onClick={(e) => e.stopPropagation()}
        >
            Book Machine
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book {asset.name}</DialogTitle>
          <DialogDescription>
            Create a rental booking for this equipment. Only existing customers can book.
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
            <p className="text-xs text-slate-500">Customer must exist in the system to book</p>
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
            <Input name="rate" type="number" defaultValue="1000" required />
          </div>

          {/* Project Reference (Optional) */}
          <div className="grid gap-2">
            <Label>Project/Site Name (Optional)</Label>
            <Input name="project_name" placeholder="e.g. Mumbai Construction Site" />
          </div>

          {/* Invoice Reference (Optional) */}
          <div className="grid gap-2">
            <Label>Linked Invoice (Optional)</Label>
            <Select value={selectedInvoice} onValueChange={setSelectedInvoice} disabled={!selectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder={selectedCustomer ? "Select invoice..." : "Select customer first"} />
              </SelectTrigger>
              <SelectContent>
                {customerInvoices.length === 0 ? (
                  <div className="p-2 text-sm text-slate-500">
                    {selectedCustomer ? "No invoices found for this customer" : "Select a customer first"}
                  </div>
                ) : (
                  customerInvoices.map((invoice) => (
                    <SelectItem key={invoice.name} value={invoice.name}>
                      {invoice.name} - ₹{invoice.grand_total.toLocaleString('en-IN')} ({invoice.status})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Link this booking to an existing invoice</p>
          </div>
          
          <Button type="submit" disabled={loading || !selectedCustomer} className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Booking
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
