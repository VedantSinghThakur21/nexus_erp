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
import { searchCustomers } from "@/app/actions/invoices"

interface CustomerSearchProps {
  value: string
  onChange: (value: string) => void
}

export function CustomerSearch({ value, onChange }: CustomerSearchProps) {
  const [open, setOpen] = React.useState(false)
  const [customers, setCustomers] = React.useState<{ name: string, customer_name: string }[]>([])
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    const fetchCustomers = async () => {
      // Use query or empty string if initial load
      const searchQuery = query || "" 
      const results = await searchCustomers(searchQuery)
      setCustomers(results)
    }
    
    // Debounce to prevent API flooding while typing
    const debounce = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(debounce)
  }, [query])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-yellow-50/50 border-yellow-200 focus-visible:ring-yellow-200 text-left font-normal"
        >
          {value
            ? customers.find((customer) => customer.name === value)?.customer_name || value
            : "Search Customer..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        {/* FIX: Added shouldFilter={false} because we filter on the server side */}
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search customer..." onValueChange={setQuery} />
          <CommandList>
            {customers.length === 0 && <CommandEmpty>No customer found.</CommandEmpty>}
            <CommandGroup>
              {customers.map((customer) => (
                <CommandItem
                  key={customer.name}
                  value={customer.name} // This is the ID
                  keywords={[customer.customer_name]} // Helps accessibility
                  onSelect={(currentValue) => {
                    // currentValue might be lowercased by cmdk, but we want the real ID
                    // Since we use the ID as the value, it should match.
                    // To be safe, we just use the customer object from the map scope
                    onChange(customer.name)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === customer.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {customer.customer_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
