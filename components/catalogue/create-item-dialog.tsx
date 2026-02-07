'use client'

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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import { createItem } from "@/app/actions/invoices"
import { useRouter } from "next/navigation"

const ITEM_GROUPS = [
  'Heavy Equipment Rental',
  'Construction Services',
  'Consulting',
]

export function CreateItemDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState('')
  const [isStockItem, setIsStockItem] = useState('1')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    formData.append('item_group', selectedGroup)
    formData.append('is_stock_item', isStockItem)
    
    const res = await createItem(formData)
    
    if (res.success) {
      setOpen(false)
      e.currentTarget.reset()
      setSelectedGroup('')
      setIsStockItem('1')
      router.refresh()
    } else {
      alert("Error: " + res.error)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center font-semibold text-sm transition shadow-sm">
          <span className="material-symbols-outlined text-xl mr-2">add</span>
          Add New Item
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Item</DialogTitle>
          <DialogDescription>
            Add a new item to your product catalogue. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Item Code */}
              <div className="grid gap-2">
                <Label htmlFor="item_code">Item Code *</Label>
                <Input
                  id="item_code"
                  name="item_code"
                  placeholder="e.g., CRANE-001"
                  required
                />
                <p className="text-xs text-slate-500">Unique identifier for the item</p>
              </div>

              {/* Item Name */}
              <div className="grid gap-2">
                <Label htmlFor="item_name">Item Name *</Label>
                <Input
                  id="item_name"
                  name="item_name"
                  placeholder="e.g., Tower Crane"
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
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_GROUPS.map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="item_group" value={selectedGroup} />
              </div>

              {/* Stock Item */}
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
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white border-b pb-2">Pricing & Inventory</h3>
            
            <div className="grid grid-cols-3 gap-4">
              {/* Standard Rate */}
              <div className="grid gap-2">
                <Label htmlFor="standard_rate">Rate (₹/day) *</Label>
                <Input
                  id="standard_rate"
                  name="standard_rate"
                  type="number"
                  step="0.01"
                  placeholder="1000"
                  required
                />
              </div>

              {/* UOM */}
              <div className="grid gap-2">
                <Label htmlFor="stock_uom">Unit of Measure *</Label>
                <Input
                  id="stock_uom"
                  name="stock_uom"
                  placeholder="Unit"
                  defaultValue="Unit"
                  required
                />
              </div>

              {/* Opening Stock */}
              {isStockItem === '1' && (
                <div className="grid gap-2">
                  <Label htmlFor="opening_stock">Opening Stock</Label>
                  <Input
                    id="opening_stock"
                    name="opening_stock"
                    type="number"
                    step="1"
                    placeholder="0"
                    defaultValue="0"
                  />
                </div>
              )}
            </div>

            {isStockItem === '1' && (
              <div className="grid grid-cols-2 gap-4">
                {/* Reorder Level */}
                <div className="grid gap-2">
                  <Label htmlFor="reorder_level">Reorder Level</Label>
                  <Input
                    id="reorder_level"
                    name="reorder_level"
                    type="number"
                    step="1"
                    placeholder="5"
                  />
                  <p className="text-xs text-slate-500">Minimum stock level before reorder</p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white border-b pb-2">Additional Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Brand */}
              <div className="grid gap-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  name="brand"
                  placeholder="e.g., Caterpillar"
                />
              </div>

              {/* Manufacturer */}
              <div className="grid gap-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  name="manufacturer"
                  placeholder="e.g., Komatsu"
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Detailed description of the item, specifications, features..."
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
