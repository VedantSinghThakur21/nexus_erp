"use client";
import { useState } from "react";
import { InvoicesGrid } from "./invoices-grid";
import { InvoicesSearchBar } from "./invoices-search-bar";

interface Invoice {
  name: string;
  customer_name: string;
  grand_total: number;
  status: string;
  due_date: string;
  currency: string;
}

interface InvoicesClientViewProps {
  invoices: Invoice[];
}

export function InvoicesClientView({ invoices }: InvoicesClientViewProps) {
  const [filtered, setFiltered] = useState(invoices);
  const handleSearch = (query: string) => {
    if (!query) setFiltered(invoices);
    else setFiltered(invoices.filter(inv =>
      inv.name.toLowerCase().includes(query.toLowerCase()) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(query.toLowerCase()))
    ));
  };
  const totalInvoices = filtered.length || 0;
  return (
    <div>
      <InvoicesSearchBar onSearch={handleSearch} />
      <InvoicesGrid invoices={filtered} page={1} pageSize={Math.max(1, filtered.length)} total={totalInvoices} onPageChange={() => {}} />
    </div>
  );
}
