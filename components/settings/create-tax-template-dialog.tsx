"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { createTaxTemplate } from "@/app/actions/settings"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TaxRow {
  id: number
  charge_type: string
  account_head: string
  description: string
  rate: number
}

export function CreateTaxTemplateDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [company, setCompany] = useState("AVARIQ")
  const [taxRows, setTaxRows] = useState<TaxRow[]>([
    { id: 1, charge_type: "On Net Total", account_head: "", description: "", rate: 0 }
  ])

  const addTaxRow = () => {
    setTaxRows([...taxRows, { 
      id: Date.now(), 
      charge_type: "On Net Total", 
      account_head: "", 
      description: "", 
      rate: 0 
    }])
  }

  const removeTaxRow = (id: number) => {
    if (taxRows.length > 1) {
      setTaxRows(taxRows.filter(row => row.id !== id))
    }
  }

  const updateTaxRow = (id: number, field: keyof TaxRow, value: any) => {
    setTaxRows(taxRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      alert("Please enter a template name")
      return
    }

    const invalidRows = taxRows.filter(row => 
      !row.account_head || !row.description || row.rate <= 0
    )

    if (invalidRows.length > 0) {
      alert("Please fill in all tax rows with valid data")
      return
    }

    setLoading(true)

    try {
      const result = await createTaxTemplate({
        title,
        company,
        taxes: taxRows.map(row => ({
          charge_type: row.charge_type,
          account_head: row.account_head,
          description: row.description,
          rate: row.rate
        }))
      })

      if (result.error) {
        alert(result.error)
      } else {
        setOpen(false)
        setTitle("")
        setTaxRows([{ id: 1, charge_type: "On Net Total", account_head: "", description: "", rate: 0 }])
        router.refresh()
      }
    } catch (error: any) {
      alert(error.message || "Failed to create tax template")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Tax Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Tax Template</DialogTitle>
          <DialogDescription>
            Create a new sales tax template that can be applied to quotations and invoices
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Template Name *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., In State GST 18%"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Tax Charges</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTaxRow}>
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </div>

            <div className="space-y-3 border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
              {taxRows.map((row, index) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 items-end pb-3 border-b last:border-0">
                  <div className="col-span-3">
                    <Label className="text-xs">Account Head *</Label>
                    <Input
                      value={row.account_head}
                      onChange={(e) => updateTaxRow(row.id, 'account_head', e.target.value)}
                      placeholder="e.g., Output Tax CGST"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="col-span-4">
                    <Label className="text-xs">Description *</Label>
                    <Input
                      value={row.description}
                      onChange={(e) => updateTaxRow(row.id, 'description', e.target.value)}
                      placeholder="e.g., CGST @ 9%"
                      className="mt-1"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Rate (%) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.rate}
                      onChange={(e) => updateTaxRow(row.id, 'rate', parseFloat(e.target.value) || 0)}
                      placeholder="9.0"
                      className="mt-1"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Type</Label>
                    <Select 
                      value={row.charge_type} 
                      onValueChange={(value) => updateTaxRow(row.id, 'charge_type', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="On Net Total">On Net Total</SelectItem>
                        <SelectItem value="On Previous Row Total">On Previous Row</SelectItem>
                        <SelectItem value="Actual">Actual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTaxRow(row.id)}
                      disabled={taxRows.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Common example: For 18% GST, add two rows - CGST @ 9% and SGST @ 9%
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Template"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
