import * as React from 'react'

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function DropdownMenu({ trigger, children, className }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className={`relative inline-block ${className || ''}`} ref={menuRef}>
      <span onClick={() => setOpen((v) => !v)} tabIndex={0} style={{ cursor: 'pointer' }}>
        {trigger}
      </span>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-lg z-50">
          {children}
        </div>
      )}
    </div>
  )
}

export function DropdownMenuItem({ children, onClick, className }: { children: React.ReactNode, onClick?: () => void, className?: string }) {
  return (
    <div
      className={`px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${className || ''}`}
      onClick={onClick}
      tabIndex={0}
    >
      {children}
    </div>
  )
}

export function DropdownMenuSeparator() {
  return <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
}

export function DropdownMenuCheckboxItem({ children, checked, onCheckedChange, className }: { children: React.ReactNode, checked?: boolean, onCheckedChange?: (checked: boolean) => void, className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${className || ''}`}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      tabIndex={0}
    >
      <span className={`inline-block w-4 h-4 border rounded ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-400'}`}>{checked ? '✓' : ''}</span>
      {children}
    </div>
  )
}
