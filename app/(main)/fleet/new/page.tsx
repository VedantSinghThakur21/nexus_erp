'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Truck, Calendar, Tag } from "lucide-react"
import { createMachine } from "@/app/actions/fleet"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function NewMachinePage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    
    const formData = new FormData(event.currentTarget)
    const res = await createMachine(formData)
    
    if (res.success) {
      router.push('/fleet')
      router.refresh()
    } else {
      alert("Error: " + res.error)
    }
    setLoading(false)
  }

  return (
    // FIX: Added to ignore browser extension attributes
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/fleet">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Add Machine</h1>
                <p className="text-slate-500">Register a new asset into the fleet</p>
            </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1: Identification */}
        <Card>
            <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base font-semibold">Machine Identity</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                        <Label>Model / Item Code <span className="text-red-500">*</span></Label>
                        <Input name="item_code" placeholder="e.g. CRANE-50T" required />
                        <p className="text-xs text-slate-400">Must match an existing Item Code in ERPNext</p>
                    </div>
                    <div className="grid gap-2">
                        <Label>Serial Number / License Plate <span className="text-red-500">*</span></Label>
                        <Input name="serial_no" placeholder="e.g. MH-12-AB-1234" required />
                    </div>
                    <div className="grid gap-2">
                        <Label>Brand / Make</Label>
                        <Input name="brand" placeholder="e.g. Liebherr" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Description</Label>
                        <Input name="description" placeholder="e.g. 50 Ton Hydraulic Crane" />
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Section 2: Status & Location */}
        <Card>
            <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-base font-semibold">Status & Location</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                        <Label>Initial Status</Label>
                        <Select name="status" defaultValue="Active">
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Active">Active (Ready to Rent)</SelectItem>
                                <SelectItem value="Maintenance">In Maintenance</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Current Location (Warehouse)</Label>
                        <Input name="warehouse" placeholder="e.g. Mumbai Yard" defaultValue="Stores - ERP" />
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Section 3: Purchase Info */}
        <Card>
            <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-base font-semibold">Purchase & Warranty</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                        <Label>Purchase Date</Label>
                        <Input name="purchase_date" type="date" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Warranty Expiry</Label>
                        <Input name="warranty_expiry" type="date" />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                        <Label>Technical Notes</Label>
                        <Textarea name="notes" placeholder="Engine number, chassis details, or inspection notes..." />
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex justify-end gap-4">
            <Button variant="outline" asChild>
                <Link href="/fleet">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 min-w-[150px]">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Machine
            </Button>
        </div>

      </form>
    </div>
  )
}

