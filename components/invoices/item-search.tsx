'use client'

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { searchItems, getItemGroups } from "@/app/actions/invoices"

interface ItemSearchProps {
  value: string
  onChange: (value: string, description?: string, itemName?: string) => void
  itemGroup?: string // Optional filter by item group
}

export function ItemSearch({ value, onChange, itemGroup }: ItemSearchProps) {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<{ item_code: string, item_name: string, description: string, item_group: string }[]>([])
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    const fetchItems = async () => {
      const searchQuery = query || "" 
      const results = await searchItems(searchQuery, itemGroup)
      setItems(results)
    }
    const debounce = setTimeout(fetchItems, 300)
    return () => clearTimeout(debounce)
  }, [query, itemGroup])

  // Group items by item_group
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, typeof items> = {}
    items.forEach(item => {
      const group = item.item_group || 'Other'
      if (!groups[group]) groups[group] = []
      groups[group].push(item)
    })
    return groups
  }, [items])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-8 px-2 text-sm font-normal border-0 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {value || <span className="text-slate-400">Select Item...</span>}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search items..." onValueChange={setQuery} />
          <CommandList>
            {items.length === 0 && <CommandEmpty>No item found.</CommandEmpty>}
            {Object.entries(groupedItems).map(([group, groupItems]) => (
              <CommandGroup key={group} heading={group}>
                {groupItems.map((item) => (
                  <CommandItem
                    key={item.item_code}
                    value={item.item_code}
                    keywords={[item.item_name, item.item_code]}
                    className="flex items-center justify-between"
                    onSelect={(currentValue) => {
                      onChange(item.item_code, item.description, item.item_name)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.item_code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.item_code}</span>
                        <Badge variant="outline" className="text-xs">{item.item_group}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{item.item_name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

