'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Loader2 } from "lucide-react"
import { createInspection } from "@/app/actions/inspections"
import { useRouter } from "next/navigation"

export function CreateInspectionForm({ machines }: { machines: any[] }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const res = await createInspection(formData)
    
    if (res.success) {
      router.push('/inspections')
      router.refresh()
    } else {
      alert("Error: " + res.error)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-semibold">Inspection Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                        <Label>Machine / Asset <span className="text-red-500">*</span></Label>
                        <Select name="machine" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Machine" />
                            </SelectTrigger>
                            <SelectContent>
                                {machines.map((m) => (
                                    <SelectItem key={m.name} value={m.name}>
                                        {m.item_name || m.item_code} ({m.name})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Inspection Type</Label>
                        <Select name="type" defaultValue="Outgoing">
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Outgoing">Outgoing (Pre-Delivery)</SelectItem>
                                <SelectItem value="Incoming">Incoming (Return)</SelectItem>
                                <SelectItem value="In Process">Maintenance Check</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label>Result Status</Label>
                    <Select name="status" defaultValue="Accepted">
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Accepted">Passed (Ready to Rent)</SelectItem>
                            <SelectItem value="Rejected">Failed (Needs Repair)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label>Remarks / Observations</Label>
                    <Textarea 
                        name="notes" 
                        placeholder="Note any scratches, fuel levels, or damages..." 
                        className="min-h-[100px]"
                    />
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Report
            </Button>
        </div>
    </form>
  )
}
