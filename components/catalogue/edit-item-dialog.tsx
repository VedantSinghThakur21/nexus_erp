'use client'

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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil } from "lucide-react"
import { updateItem } from "@/app/actions/invoices"
import { useRouter } from "next/navigation"

const ITEM_GROUPS = [
  'Heavy Equipment Rental',
  'Construction Services',
  'Consulting',
]

interface EditItemDialogProps {
  item: {
    item_code: string
    item_name: string
    item_group: string
    description?: string
    standard_rate: number
    is_stock_item?: number
  }
}

export function EditItemDialog({ item }: EditItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(item.item_group)
  const [isStockItem, setIsStockItem] = useState(String(item.is_stock_item || 0))
  const router = useRouter()

  // Update state when item changes
  useEffect(() => {
    setSelectedGroup(item.item_group)
    setIsStockItem(String(item.is_stock_item || 0))
  }, [item])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    formData.append('item_group', selectedGroup)
    formData.append('is_stock_item', isStockItem)
    
    const res = await updateItem(item.item_code, formData)
    
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
        <Button variant="outline" size="sm" className="w-full">
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update item details for {item.item_code}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Item Code (Read-only) */}
            <div className="grid gap-2">
              <Label htmlFor="item_code">Item Code</Label>
              <Input
                id="item_code"
                value={item.item_code}
                disabled
                className="bg-slate-100 dark:bg-slate-800"
              />
            </div>

            {/* Item Name */}
            <div className="grid gap-2">
              <Label htmlFor="item_name">Item Name *</Label>
              <Input
                id="item_name"
                name="item_name"
                defaultValue={item.item_name}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Item Group */}
            <div className="grid gap-2">
              <Label htmlFor="item_group">Category *</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_GROUPS.map(group => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="item_group" value={selectedGroup} />
            </div>

            {/* Standard Rate */}
            <div className="grid gap-2">
              <Label htmlFor="standard_rate">Rate (₹/day) *</Label>
              <Input
                id="standard_rate"
                name="standard_rate"
                type="number"
                step="0.01"
                defaultValue={item.standard_rate}
                required
              />
            </div>
          </div>

          {/* Stock Item Type */}
          <div className="grid gap-2">
            <Label htmlFor="is_stock_item">Type *</Label>
            <Select value={isStockItem} onValueChange={setIsStockItem}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Stock Item (Physical)</SelectItem>
                <SelectItem value="0">Service (Non-stock)</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="is_stock_item" value={isStockItem} />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={item.description || ''}
              placeholder="Detailed description of the item..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
