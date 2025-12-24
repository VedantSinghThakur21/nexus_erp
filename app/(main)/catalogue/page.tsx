'use client'

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Package, Wrench, Briefcase, CheckCircle, XCircle, Search, Eye, TrendingUp, Calendar, DollarSign } from "lucide-react"
import { searchItems, getItemGroups, ensureItemGroups, getItemDetails } from "@/app/actions/invoices"
import { getItemRentalAnalytics } from "@/app/actions/bookings"
import { CreateBookingDialog } from "@/components/bookings/create-booking-dialog"
import { CreateItemDialog } from "@/components/catalogue/create-item-dialog"
import { EditItemDialog } from "@/components/catalogue/edit-item-dialog"

interface Item {
  item_code: string
  item_name: string
  description: string
  item_group: string
  standard_rate: number
  stock_qty?: number | null
  available: boolean
  is_stock_item?: number
}

interface ItemDetails extends Item {
  current_price?: number
  has_serial_no?: number
  has_batch_no?: number
  uom?: string
}

interface RentalAnalytics {
  totalRentals: number
  totalRevenue: number
  averageRentalDays: number
  recentRentals: any[]
}

const groupIcons: Record<string, any> = {
  "Heavy Equipment Rental": Package,
  "Construction Services": Wrench,
  "Consulting": Briefcase,
}

const groupColors: Record<string, string> = {
  "Heavy Equipment Rental": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Construction Services": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Consulting": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
}

export default function CataloguePage() {
  const [allItems, setAllItems] = useState<Item[]>([])
  const [itemGroups, setItemGroups] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('All')
  const [selectedItem, setSelectedItem] = useState<ItemDetails | null>(null)
  const [itemAnalytics, setItemAnalytics] = useState<RentalAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  
  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        await ensureItemGroups()
        const items = await searchItems('')
        setAllItems(items)
        // Only show our 3 business categories
        setItemGroups(['All', 'Heavy Equipment Rental', 'Construction Services', 'Consulting'])
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])
  
  // Filter items based on search and group
  const filteredItems = useMemo(() => {
    let items = allItems
    
    // Filter by group
    if (selectedGroup !== 'All') {
      items = items.filter(item => item.item_group === selectedGroup)
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      items = items.filter(item => 
        item.item_name.toLowerCase().includes(query) ||
        item.item_code.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      )
    }
    
    return items
  }, [allItems, searchQuery, selectedGroup])
  
  // Calculate summary stats
  const totalItems = allItems.length
  const availableItems = allItems.filter(item => item.available).length
  
  // Group-specific stats
  const getGroupStats = (groupName: string) => {
    const items = allItems.filter(item => item.item_group === groupName)
    return {
      total: items.length,
      available: items.filter(item => item.available).length
    }
  }
  
  // Load item details for quick view
  const handleQuickView = async (itemCode: string) => {
    setIsLoadingDetails(true)
    try {
      const [details, analytics] = await Promise.all([
        getItemDetails(itemCode),
        getItemRentalAnalytics(itemCode)
      ])
      setSelectedItem(details)
      setItemAnalytics(analytics)
    } finally {
      setIsLoadingDetails(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Product Catalogue</h1>
          <p className="text-slate-500 mt-1">Browse items by business category</p>
        </div>
        <CreateItemDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">{itemGroups.length - 1} categories</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Now</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableItems}</div>
            <p className="text-xs text-muted-foreground">Ready to book</p>
          </CardContent>
        </Card>
        
        {['Heavy Equipment Rental', 'Construction Services'].map(group => {
          const Icon = groupIcons[group] || Package
          const stats = getGroupStats(group)
          
          return (
            <Card key={group}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{group}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">{stats.available} available</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search items by name, code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {itemGroups.map(group => {
            const Icon = group === 'All' ? Package : groupIcons[group] || Package
            return (
              <Button
                key={group}
                variant={selectedGroup === group ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedGroup(group)}
                className="whitespace-nowrap"
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {group}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No items found matching your criteria.</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters.</p>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map(item => (
            <Card key={item.item_code} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="space-y-2.5">
                  <div>
                    <CardTitle className="text-lg font-semibold leading-tight">{item.item_name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{item.item_code}</p>
                  </div>
                  <Badge variant="secondary" className={`text-xs w-fit ${groupColors[item.item_group] || ''}`}>
                    {item.item_group}
                  </Badge>
                </div>
                
                {/* Stock & Price Info */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  {item.stock_qty !== null ? (
                    <Badge 
                      variant={item.available ? "default" : "outline"}
                      className={item.available ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300"}
                    >
                      {item.available ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> In Stock ({item.stock_qty})</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" /> Out of Stock</>
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300">
                      <CheckCircle className="h-3 w-3 mr-1" /> Service
                    </Badge>
                  )}
                  {item.standard_rate ? (
                    <span className="text-sm font-semibold text-slate-900 dark:text-white ml-auto">
                      ₹{Math.round(item.standard_rate).toLocaleString('en-IN')}<span className="text-xs text-slate-500 font-normal">/day</span>
                    </span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[40px]">
                    {item.description}
                  </p>
                )}
                <div className="space-y-2">
                  <div className="w-full">
                    <CreateBookingDialog 
                      itemCode={item.item_code} 
                      itemName={item.item_name}
                      defaultRate={item.standard_rate || 1000}
                      available={item.available}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickView(item.item_code)}
                      className="text-xs"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Details
                    </Button>
                    <EditItemDialog item={item} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick View Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => { setSelectedItem(null); setItemAnalytics(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem?.item_name}</DialogTitle>
            <DialogDescription>Item Code: {selectedItem?.item_code}</DialogDescription>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            </div>
          ) : selectedItem && (
            <div className="space-y-4">
              {/* Stock & Price Section */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Availability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedItem.stock_qty !== null ? (
                      <>
                        <div className="text-2xl font-bold">{selectedItem.stock_qty}</div>
                        <p className="text-xs text-muted-foreground">
                          {selectedItem.available ? 'In Stock' : 'Out of Stock'}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">∞</div>
                        <p className="text-xs text-muted-foreground">Service (Always Available)</p>
                      </>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ₹{(selectedItem.current_price || selectedItem.standard_rate).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-muted-foreground">Per day</p>
                  </CardContent>
                </Card>
              </div>

              {/* Rental Analytics */}
              {itemAnalytics && itemAnalytics.totalRentals > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Rental Performance
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Total Rentals
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                          {itemAnalytics.totalRentals}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-green-700 dark:text-green-300 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Revenue
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-green-900 dark:text-green-100">
                          ₹{(itemAnalytics.totalRevenue / 1000).toFixed(0)}K
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Avg Duration
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
                          {itemAnalytics.averageRentalDays} days
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedItem.description && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Description</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedItem.description}
                  </p>
                </div>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Category:</span>{' '}
                  <Badge variant="secondary" className="ml-1">
                    {selectedItem.item_group}
                  </Badge>
                </div>
                {selectedItem.uom && (
                  <div>
                    <span className="font-semibold">Unit:</span> {selectedItem.uom}
                  </div>
                )}
                <div>
                  <span className="font-semibold">Stock Item:</span>{' '}
                  {selectedItem.is_stock_item ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-semibold">Has Serial No:</span>{' '}
                  {selectedItem.has_serial_no ? 'Yes' : 'No'}
                </div>
              </div>

              {/* Recent Rentals */}
              {itemAnalytics && itemAnalytics.recentRentals.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Recent Rentals</h4>
                  <div className="space-y-2">
                    {itemAnalytics.recentRentals.map((rental: any) => (
                      <div key={rental.name} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900 text-sm">
                        <div>
                          <div className="font-medium">{rental.customer_name}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(rental.transaction_date).toLocaleDateString()} - {new Date(rental.delivery_date).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="outline">{rental.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4 border-t">
                <CreateBookingDialog 
                  itemCode={selectedItem.item_code} 
                  itemName={selectedItem.item_name}
                  defaultRate={selectedItem.current_price || selectedItem.standard_rate || 1000}
                  available={selectedItem.available}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
