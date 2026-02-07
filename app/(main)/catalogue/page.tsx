'use client'

import { useState, useEffect, useMemo } from "react"
import { searchItems, ensureItemGroups, getItemDetails } from "@/app/actions/invoices"
import { getItemRentalAnalytics } from "@/app/actions/bookings"
import { CreateItemDialog } from "@/components/catalogue/create-item-dialog"
import { EditItemDialog } from "@/components/catalogue/edit-item-dialog"
import { CreateBookingDialog } from "@/components/bookings/create-booking-dialog"

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
  
  // Dynamically build categories from actual item groups
  const uniqueItemGroups = useMemo(() => {
    const groups = new Set(allItems.map(item => item.item_group))
    return ['All', ...Array.from(groups).sort()]
  }, [allItems])
  
  const categories = uniqueItemGroups
  
  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        await ensureItemGroups()
        const items = await searchItems('')
        setAllItems(items)
      } catch (error) {
        console.error('Failed to load items:', error)
        setAllItems([])
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])
  
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
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <div className="max-w-[1600px] mx-auto p-8">
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
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 w-full z-10">
        <div className="relative w-[480px]">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-full py-2.5 pl-11 pr-5 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-500"
            placeholder="Ask AI anything..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-6">
          <CreateItemDialog />
          <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight">Admin User</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                Catalogue Manager
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ring-2 ring-slate-100 dark:ring-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
              AU
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-background-dark custom-scrollbar">
        <div className="max-w-full mx-auto space-y-8">
          {/* KPI Cards - Matching Leads Dashboard Style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111827] p-7 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px] border border-slate-800/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Total Items</p>
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-400 flex items-center justify-center rounded-full ring-1 ring-blue-500/30">
                    <span className="material-symbols-outlined text-xl">inventory_2</span>
                  </div>
                </div>
                <h3 className="text-4xl font-bold text-white mb-1">{totalItems}</h3>
                <p className="text-sm text-slate-400">{categories.length - 1} categories</p>
              </div>
            </div>
            <div className="bg-[#111827] p-7 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px] border border-slate-800/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Available Now</p>
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 flex items-center justify-center rounded-full ring-1 ring-emerald-500/30">
                    <span className="material-symbols-outlined text-xl">check_circle</span>
                  </div>
                </div>
                <h3 className="text-4xl font-bold text-white mb-1">{availableItems}</h3>
                <p className="text-sm text-slate-400">Ready to book</p>
              </div>
            </div>
            <div className="bg-[#111827] p-7 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px] border border-slate-800/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Filtered Results</p>
                  <div className="w-10 h-10 bg-purple-500/10 text-purple-400 flex items-center justify-center rounded-full ring-1 ring-purple-500/30">
                    <span className="material-symbols-outlined text-xl">filter_alt</span>
                  </div>
                </div>
                <h3 className="text-4xl font-bold text-white mb-1">{filteredItems.length}</h3>
                <p className="text-sm text-slate-400">Showing {selectedCategories.has('All') ? 'All' : Array.from(selectedCategories).join(', ')}</p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-12 gap-8">
            {/* Left Sidebar - Filters */}
            <aside className="col-span-12 lg:col-span-3 xl:col-span-2 space-y-8">
              <div>
                <h5 className="text-[11px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400 mb-4 border-b dark:border-slate-800 pb-2">Categories</h5>
                <div className="space-y-3">
                  {categories.map(category => (
                    <label key={category} className="flex items-center group cursor-pointer">
                      <input 
                        checked={selectedCategories.has(category)}
                        onChange={() => toggleCategory(category)}
                        className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-4 w-4" 
                        type="checkbox"
                      />
                      <span className="ml-3 text-sm text-slate-700 dark:text-slate-300 group-hover:text-primary">{category}</span>
                      <span className="ml-auto text-xs text-slate-400">{getCategoryCount(category)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-[11px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400 mb-4 border-b dark:border-slate-800 pb-2">Price Range</h5>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 mb-1 block">MIN</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input 
                        className="w-full pl-6 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-sm" 
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
                        className="w-full pl-6 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-sm" 
                        type="text" 
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(parseInt(e.target.value) || 5000)}
                      />
                    </div>
                  </div>
                </div>
                <input 
                  className="w-full" 
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
                    className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
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
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center ${
                          isActive 
                            ? 'bg-midnight-blue text-white' 
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition'
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.length === 0 ? (
                  <div className="col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-3xl text-slate-400">inventory_2</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No items found</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                      {allItems.length === 0 
                        ? "Get started by adding your first item to the catalogue."
                        : "Try adjusting your filters or search query."}
                    </p>
                    {allItems.length === 0 && <CreateItemDialog />}
                  </div>
                ) : (
                  filteredItems.map(item => (
                  <div key={item.item_code} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm group hover:shadow-md transition">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.item_name}</h3>
                          <p className="text-xs text-slate-500 uppercase font-medium">{item.item_code}</p>
                        </div>
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase">{item.item_group}</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center space-x-2">
                          {item.stock_qty !== null ? (
                            <span className={`${item.available ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30'} text-[11px] font-semibold px-2 py-1 rounded-md border flex items-center`}>
                              <span className="material-symbols-outlined text-xs mr-1">check_circle</span> 
                              {item.available ? `In Stock (${item.stock_qty})` : 'Out of Stock'}
                            </span>
                          ) : (
                            <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[11px] font-semibold px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30 flex items-center">
                              <span className="material-symbols-outlined text-xs mr-1">check_circle</span> Service
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">{item.description || 'No description available.'}</p>
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
                        className="flex-1 py-3 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-sm mr-1">visibility</span> Details
                      </button>
                      <div className="w-px bg-slate-100 dark:bg-slate-800"></div>
                      <button 
                        onClick={() => setEditingItem(item)}
                        className="flex-1 py-3 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-sm mr-1">edit</span> Edit
                      </button>
                    </div>
                  </div>
                  ))
                )}
              </div>
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
                <button className="w-full py-2.5 bg-white text-midnight-blue rounded-lg font-bold text-sm hover:bg-slate-100 transition">Contact Support</button>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      {editingItem && (
        <EditItemDialog 
          item={editingItem}
        />
      )}

      {/* Quick View Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedItem.item_name}</h3>
                  <p className="text-sm text-slate-500 mt-1">Code: {selectedItem.item_code}</p>
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
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Availability</p>
                      <p className="text-2xl font-bold">{selectedItem.stock_qty !== null ? selectedItem.stock_qty : '∞'}</p>
                      <p className="text-xs text-slate-500">{selectedItem.available ? 'In Stock' : 'Service'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Rate</p>
                      <p className="text-2xl font-bold">₹{(selectedItem.current_price || selectedItem.standard_rate || 0).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-slate-500">Per day</p>
                    </div>
                  </div>
                  
                  {selectedItem.description && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Description</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{selectedItem.description}</p>
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
