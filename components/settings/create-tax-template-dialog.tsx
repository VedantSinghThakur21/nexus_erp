"use client"

import { useState, useEffect } from "react"
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
import { createTaxTemplate, getTaxAccounts } from "@/app/actions/settings"
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
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [company, setCompany] = useState("AVARIQ")
  const [availableAccounts, setAvailableAccounts] = useState<Array<{name: string, account_name: string}>>([])
  const [taxRows, setTaxRows] = useState<TaxRow[]>([
    { id: 1, charge_type: "On Net Total", account_head: "", description: "", rate: 0 }
  ])

  // Fetch tax accounts when company changes
  useEffect(() => {
    if (company && open) {
      setLoadingAccounts(true)
      getTaxAccounts(company).then(accounts => {
        setAvailableAccounts(accounts)
        setLoadingAccounts(false)
      })
    }
  }, [company, open])

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
                    {loadingAccounts ? (
                      <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-slate-100">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs text-slate-500">Loading...</span>
                      </div>
                    ) : availableAccounts.length > 0 ? (
                      <Select 
                        value={row.account_head} 
                        onValueChange={(value) => updateTaxRow(row.id, 'account_head', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAccounts.map(account => (
                            <SelectItem key={account.name} value={account.name}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={row.account_head}
                        onChange={(e) => updateTaxRow(row.id, 'account_head', e.target.value)}
                        placeholder="Enter account name"
                        className="mt-1"
                      />
                    )}
                  </div>
                  
                  <div className="col-span-4">
                    <Label className="text-xs">Description *</Label>
                    <Input
                      value={row.description}
                      onChange={(e) => updateTaxRow(row.id, 'description', e.target.value)}
                      placeholder="CGST @ 9%"
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

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200 dark:border-blue-800">
              <p className="font-semibold text-blue-900 dark:text-blue-100">Account Selection:</p>
              <p>✓ Select tax accounts from the dropdown (fetched from your ERPNext Chart of Accounts)</p>
              <p>✓ Common tax accounts: Look for "Output Tax CGST", "Output Tax SGST", "Output Tax IGST"</p>
              {availableAccounts.length === 0 && !loadingAccounts && (
                <p className="text-amber-700 dark:text-amber-400 mt-2">⚠️ No tax accounts found. You may need to create them in ERPNext first.</p>
              )}
            </div>
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
