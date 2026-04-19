"use client";
import { useState } from "react";

interface InvoicesSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function InvoicesSearchBar({ onSearch, placeholder = "Search invoices..." }: InvoicesSearchBarProps) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSearch(value.trim());
      }}
      className="flex gap-2 mb-4"
    >
      <input
        type="text"
        className="w-full px-3 py-2 border rounded bg-card text-sm bg-background border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
      >
        Search
      </button>
    </form>
  );
}
