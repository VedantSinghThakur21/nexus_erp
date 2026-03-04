'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DollarSign, Loader2 } from "lucide-react"
import { createPaymentEntry } from "@/app/actions/invoices"
import { getModesOfPayment } from "@/app/actions/common"
import { useRouter } from "next/navigation"

export function PaymentDialog({ invoice }: { invoice: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paymentModes, setPaymentModes] = useState<string[]>([])
  const [loadingModes, setLoadingModes] = useState(false)
  const [formData, setFormData] = useState({
    paymentAmount: Number(invoice.outstanding_amount ?? invoice.grand_total ?? 0),
    paymentDate: new Date().toISOString().split('T')[0],
    modeOfPayment: '',
    referenceNo: '',
    referenceDate: new Date().toISOString().split('T')[0]
  })
  const router = useRouter()

  // Fetch modes from ERPNext when dialog opens
  useEffect(() => {
    if (!open) return
    setLoadingModes(true)
    getModesOfPayment().then(modes => {
      setPaymentModes(modes)
      if (modes.length > 0 && !formData.modeOfPayment) {
        setFormData(f => ({ ...f, modeOfPayment: modes[0] }))
      }
      setLoadingModes(false)
    }).catch(() => setLoadingModes(false))
  }, [open])

  const outstandingAmount = invoice.outstanding_amount || invoice.grand_total || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.paymentAmount <= 0) {
      alert('Payment amount must be greater than 0')
      return
    }

    if (formData.paymentAmount > outstandingAmount) {
      alert(`Payment amount cannot exceed outstanding amount of ${invoice.currency} ${outstandingAmount.toLocaleString()}`)
      return
    }

    setLoading(true)
    const result = await createPaymentEntry({
      invoiceName: invoice.name,
      paymentAmount: formData.paymentAmount,
      paymentDate: formData.paymentDate,
      modeOfPayment: formData.modeOfPayment,
      referenceNo: formData.referenceNo,
      referenceDate: formData.referenceDate
    })

    setLoading(false)

    if (result.error) {
      alert('Error: ' + result.error)
    } else {
      alert('✅ Payment entry created successfully!')
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
          <DollarSign className="h-4 w-4" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Create a payment entry for invoice {invoice.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Outstanding Amount Display */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="text-sm text-slate-500">Outstanding Amount</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {invoice.currency} {outstandingAmount.toLocaleString()}
              </div>
            </div>

            {/* Payment Amount */}
            <div className="grid gap-2">
              <Label htmlFor="paymentAmount">Payment Amount *</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0"
                max={outstandingAmount}
                value={formData.paymentAmount}
                onChange={(e) => setFormData({ ...formData, paymentAmount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            {/* Payment Date */}
            <div className="grid gap-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                required
              />
            </div>

            {/* Mode of Payment */}
            <div className="grid gap-2">
              <Label htmlFor="modeOfPayment">Mode of Payment *</Label>
              <Select
                value={formData.modeOfPayment}
                onValueChange={(value) => setFormData({ ...formData, modeOfPayment: value })}
                disabled={loadingModes}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingModes ? 'Loading...' : 'Select mode'} />
                </SelectTrigger>
                <SelectContent>
                  {paymentModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference Number */}
            <div className="grid gap-2">
              <Label htmlFor="referenceNo">Reference No (Optional)</Label>
              <Input
                id="referenceNo"
                type="text"
                placeholder="Cheque/Transaction number"
                value={formData.referenceNo}
                onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
              />
            </div>

            {/* Reference Date */}
            <div className="grid gap-2">
              <Label htmlFor="referenceDate">Reference Date</Label>
              <Input
                id="referenceDate"
                type="date"
                value={formData.referenceDate}
                onChange={(e) => setFormData({ ...formData, referenceDate: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Payment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

