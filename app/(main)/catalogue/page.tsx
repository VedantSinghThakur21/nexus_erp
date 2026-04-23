'use client'

import { useState, useEffect, useMemo, useCallback } from "react"
import { searchItems, getItemDetails } from "@/app/actions/invoices"
import { getItemRentalAnalytics } from "@/app/actions/bookings"
import { CreateItemDialog } from "@/components/catalogue/create-item-dialog"
import { EditItemDialog } from "@/components/catalogue/edit-item-dialog"
import { CreateBookingDialog } from "@/components/bookings/create-booking-dialog"
import { PageHeader } from "@/components/page-header"

interface Item {
  item_code: string
  item_name: string
  description: string
  item_group: string
  standard_rate?: number
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

export default function CataloguePage() {
  const [allItems, setAllItems] = useState<Item[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(['All']))
  const [searchQuery, setSearchQuery] = useState('')
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(5000)
  const [selectedItem, setSelectedItem] = useState<ItemDetails | null>(null)
  const [itemAnalytics, setItemAnalytics] = useState<RentalAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4

  // Dynamically build categories from actual item groups
  const uniqueItemGroups = useMemo(() => {
    const groups = new Set(allItems.map(item => item.item_group))
    return ['All', ...Array.from(groups).sort()]
  }, [allItems])

  const categories = uniqueItemGroups

  // Single source of truth for loading items (reusable on create/edit)
  const loadItems = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true)
    try {
      const items = await searchItems('')
      setAllItems(items)
    } catch (error) {
      console.error('Failed to load items:', error)
      setAllItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems(true)
  }, [loadItems])

  // Filter items based on search, categories, and price
  const filteredItems: Item[] = useMemo(() => {
    let items = allItems;
    // If 'All' is selected, show all items
    if (selectedCategories.has('All')) {
      // No filtering by group
    } else if (selectedCategories.size > 0) {
      items = items.filter((item: Item) => selectedCategories.has(item.item_group));
    }
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item: Item) =>
        item.item_name.toLowerCase().includes(query) ||
        item.item_code.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    return items;
  }, [allItems, searchQuery, selectedCategories]);

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredItems.slice(startIndex, endIndex)
  }, [filteredItems, currentPage])

  // Reset to page 1 when filtered items change
  useEffect(() => {
    setCurrentPage(1)
  }, [filteredItems])

  // Calculate summary stats
  const totalItems = allItems.length
  const availableItems = allItems.filter(item => item.available).length

  // Category counts
  const getCategoryCount = (category: string) => {
    if (category === 'All') return totalItems
    return allItems.filter(item => item.item_group === category).length
  }

  // Toggle category selection
  const toggleCategory = (category: string) => {
    const newSelected = new Set(selectedCategories)

    if (category === 'All') {
      setSelectedCategories(new Set(['All']))
    } else {
      newSelected.delete('All')
      if (newSelected.has(category)) {
        newSelected.delete(category)
      } else {
        newSelected.add(category)
      }

      if (newSelected.size === 0) {
        newSelected.add('All')
      }

      setSelectedCategories(newSelected)
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
      <div className="app-content">
        <div className="w-full">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <PageHeader searchQuery={searchQuery} onSearchChange={setSearchQuery}>
        <CreateItemDialog onCreated={() => loadItems()} />
      </PageHeader>

      {/* Main Content */}
      <main className="app-content flex-1 w-full">
        <div className="app-container w-full space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[13px] font-medium text-muted-foreground">Total Items</p>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-2xl font-medium text-foreground leading-none">{totalItems}</p>
                <span className="text-sm font-semibold text-slate-400 mb-1">{categories.length - 1} categories</span>
              </div>
              <div className="mt-5 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[72%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[13px] font-medium text-muted-foreground">Available Now</p>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-2xl font-medium text-foreground leading-none">{availableItems}</p>
                <span className="text-sm font-semibold text-slate-400 mb-1">Ready to book</span>
              </div>
              <div className="mt-5 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                  style={{ width: `${totalItems > 0 ? Math.round((availableItems / totalItems) * 100) : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[13px] font-medium text-muted-foreground">Filtered Results</p>
                <div className="p-2 rounded-lg bg-yellow-400/10 text-yellow-400">
                  <span className="material-symbols-outlined text-[20px]">filter_alt</span>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-2xl font-medium text-foreground leading-none">{filteredItems.length}</p>
                <span className="text-sm font-semibold text-slate-400 mb-1 truncate">
                  {selectedCategories.has('All') ? 'Showing All' : Array.from(selectedCategories).join(', ')}
                </span>
              </div>
              <div className="mt-5 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]"
                  style={{ width: `${totalItems > 0 ? Math.round((filteredItems.length / totalItems) * 100) : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-12 gap-8">
            {/* Left Sidebar - Filters */}
            <aside className="col-span-12 lg:col-span-3 xl:col-span-2 space-y-8">
              <div>
                <h5 className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground  mb-4 border-b dark:border-slate-800 pb-2">Categories</h5>
                <div className="space-y-3">
                  {categories.map(category => (
                    <label key={category} className="flex items-center group cursor-pointer">
                      <input
                        checked={selectedCategories.has(category)}
                        onChange={() => toggleCategory(category)}
                        className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-4 w-4"
                        type="checkbox"
                      />
                      <span className="ml-3 text-sm text-slate-700  group-hover:text-primary">{category}</span>
                      <span className="ml-auto text-xs text-slate-400">{getCategoryCount(category)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground  mb-4 border-b dark:border-slate-800 pb-2">Price Range</h5>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 mb-1 block">MIN</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input
                        className="w-full pl-6 pr-3 py-1.5 bg-card border border-slate-200 rounded text-sm bg-background border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                        type="text"
                        value={minPrice}
                        onChange={(e) => setMinPrice(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 mb-1 block">MAX</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input
                        className="w-full pl-6 pr-3 py-1.5 bg-card border border-slate-200 rounded text-sm bg-background border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                        type="text"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(parseInt(e.target.value) || 5000)}
                      />
                    </div>
                  </div>
                </div>
                <input
                  className="w-full bg-background border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  type="range"
                  min="0"
                  max="5000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                />
              </div>
            </aside>

            {/* Center - Items Grid */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-7 space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                  <input
                    className="w-full pl-12 pr-4 py-2.5 bg-card border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Search items by name, code, or description..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => {
                    const isActive = selectedCategories.has(category)
                    return (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center ${isActive
                            ? 'bg-midnight-blue text-white'
                            : 'bg-card dark:bg-background border border-slate-200 dark:border-slate-800 text-slate-600  hover:bg-slate-50 transition'
                          }`}
                      >
                        <span className="material-symbols-outlined text-sm mr-2">
                          {category === 'All' ? 'apps' : category === 'Heavy Equipment Rental' ? 'agriculture' : 'build'}
                        </span>
                        {category}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredItems.length === 0 ? (
                  <div className="col-span-2 bg-card dark:bg-background border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-3xl text-slate-400">inventory_2</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No items found</h3>
                    <p className="text-sm text-muted-foreground  mb-6">
                      {allItems.length === 0
                        ? "Get started by adding your first item to the catalogue."
                        : "Try adjusting your filters or search query."}
                    </p>
                    {allItems.length === 0 && <CreateItemDialog onCreated={() => loadItems()} />}
                  </div>
                ) : (
                  paginatedItems.map(item => (
                    <div key={item.item_code} className="bg-card dark:bg-background border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm group hover:shadow-md transition">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.item_name}</h3>
                            <p className="text-xs text-muted-foreground uppercase font-medium">{item.item_code}</p>
                          </div>
                          <span className="bg-blue-100 dark:bg-blue-900/40 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase">{item.item_group}</span>
                        </div>
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center space-x-2">
                            {item.stock_qty !== null ? (
                              <span className={`${item.available ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30'} text-[11px] font-semibold px-2 py-1 rounded-md border flex items-center`}>
                                <span className="material-symbols-outlined text-xs mr-1">{item.available ? 'check_circle' : 'cancel'}</span>
                                {item.available ? `In Stock (${item.stock_qty})` : 'Out of Stock'}
                              </span>
                            ) : (
                              <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[11px] font-semibold px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30 flex items-center">
                                <span className="material-symbols-outlined text-xs mr-1">check_circle</span> Service
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.description || 'No description available.'}</p>
                        </div>
                        <div className="mt-6 flex items-baseline space-x-1">
                          <span className="text-xl font-bold">₹{Math.round(item.standard_rate || 0).toLocaleString('en-IN')}</span>
                          <span className="text-slate-400 text-xs">{item.is_stock_item ? '/day' : '/session'}</span>
                        </div>
                        <div className="mt-6">
                          <CreateBookingDialog
                            itemCode={item.item_code}
                            itemName={item.item_name}
                            defaultRate={item.standard_rate || 1000}
                            available={item.available}
                          />
                        </div>
                      </div>
                      <div className="flex border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleQuickView(item.item_code)}
                          className="flex-1 py-3 text-xs font-medium text-slate-600  hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-sm mr-1">visibility</span> Details
                        </button>
                        <div className="w-px bg-slate-100 dark:bg-slate-800"></div>
                        <button
                          onClick={() => setEditingItem(item)}
                          className="flex-1 py-3 text-xs font-medium text-slate-600  hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-sm mr-1">edit</span> Edit
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination Controls */}
              {filteredItems.length > itemsPerPage && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/40 dark:border-slate-800">
                  <p className="text-sm text-slate-600 ">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600  hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition ${currentPage === page
                              ? 'bg-primary text-white'
                              : 'border border-slate-200 dark:border-slate-800 text-slate-600  hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600  hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar - AI Intelligence */}
            <aside className="col-span-12 lg:col-span-3 xl:col-span-3 space-y-6">
              <div className="bg-panel-dark border border-slate-800 rounded-xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h5 className="text-[11px] uppercase font-bold tracking-widest text-slate-300">AI Intelligence</h5>
                  <span className="material-symbols-outlined text-vibrant-blue text-xl">auto_awesome</span>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-card-dark rounded-lg border border-slate-700">
                    <p className="text-sm font-semibold text-white mb-1.5">Market Trend Alert</p>
                    <p className="text-xs text-slate-300 leading-relaxed">Rental demand for 'Heavy Cranes' is up 15% this quarter. Consider adjusting pricing.</p>
                  </div>
                  <div className="p-4 bg-card-dark rounded-lg border border-slate-700">
                    <p className="text-sm font-semibold text-white mb-1.5">Inventory Optimization</p>
                    <p className="text-xs text-slate-300 leading-relaxed">2 items have had no bookings for 60 days. Recommend marking as 'Clearance'.</p>
                  </div>
                </div>
                <button className="w-full mt-6 py-2.5 text-xs font-bold text-vibrant-yellow hover:text-yellow-300 flex items-center justify-center transition uppercase tracking-wider">
                  Full AI Report <span className="material-symbols-outlined text-xs ml-1.5">arrow_forward</span>
                </button>
              </div>
              <div className="bg-gradient-to-br from-midnight-blue to-slate-800 rounded-xl p-6 text-white shadow-xl">
                <span className="material-symbols-outlined text-3xl mb-4 text-blue-400">help_center</span>
                <h4 className="font-bold mb-2">Need Workspace Help?</h4>
                <p className="text-sm text-slate-300 mb-4">Our enterprise support team is available 24/7 to help you optimize your catalogue.</p>
                <button className="w-full py-2.5 bg-background text-midnight-blue rounded-lg font-bold text-sm hover:bg-slate-100 transition">Contact Support</button>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      {editingItem && (
        <EditItemDialog
          item={editingItem}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onUpdated={() => loadItems()}
        />
      )}

      {/* Quick View Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-card dark:bg-background rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedItem.item_name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">Code: {selectedItem.item_code}</p>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {isLoadingDetails ? (
                <div className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-muted-foreground  mb-1">Availability</p>
                      <p className="text-2xl font-bold">{selectedItem.stock_qty !== null ? selectedItem.stock_qty : '∞'}</p>
                      <p className="text-xs text-muted-foreground">{selectedItem.available ? 'In Stock' : 'Service'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-muted-foreground  mb-1">Rate</p>
                      <p className="text-2xl font-bold">₹{(selectedItem.current_price || selectedItem.standard_rate || 0).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground">Per day</p>
                    </div>
                  </div>

                  {selectedItem.description && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Description</h4>
                      <p className="text-sm text-slate-600 ">{selectedItem.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">Category:</span> {selectedItem.item_group}</div>
                    <div><span className="font-semibold">Unit:</span> {selectedItem.uom || 'Unit'}</div>
                    <div><span className="font-semibold">Stock Item:</span> {selectedItem.is_stock_item ? 'Yes' : 'No'}</div>
                    <div><span className="font-semibold">Has Serial No:</span> {selectedItem.has_serial_no ? 'Yes' : 'No'}</div>
                  </div>

                  {itemAnalytics && itemAnalytics.totalRentals > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Rental Performance</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">Total Rentals</p>
                          <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{itemAnalytics.totalRentals}</p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-xs text-green-700 dark:text-green-300 mb-1">Revenue</p>
                          <p className="text-xl font-bold text-green-900 dark:text-green-100">₹{(itemAnalytics.totalRevenue / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <p className="text-xs text-purple-700 dark:text-purple-300 mb-1">Avg Duration</p>
                          <p className="text-xl font-bold text-purple-900 dark:text-purple-100">{itemAnalytics.averageRentalDays}d</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
