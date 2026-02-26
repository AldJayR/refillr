import { useState, useEffect, useCallback } from 'react'
import { Flame, Package, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

export interface SearchResult {
  id: string
  type: 'brand' | 'size' | 'location'
  label: string
  sublabel?: string
  /** Structured filter fields — use these instead of parsing `label` */
  brandName?: string
  sizeLabel?: string
}

interface CommandMenuProps {
  onSearch?: (query: string) => void
  onSelect?: (result: SearchResult) => void
  className?: string
}

const POPULAR_SEARCHES: SearchResult[] = [
  { id: '1', type: 'brand', label: 'Gasul 11kg', sublabel: 'Most popular', brandName: 'Gasul', sizeLabel: '11kg' },
  { id: '2', type: 'brand', label: 'Solane 2.7kg', sublabel: 'Compact size', brandName: 'Solane', sizeLabel: '2.7kg' },
  { id: '3', type: 'brand', label: 'Petron 11kg', sublabel: 'Trusted brand', brandName: 'Petron', sizeLabel: '11kg' },
  { id: '4', type: 'size', label: '11kg', sublabel: 'Standard household', sizeLabel: '11kg' },
  { id: '5', type: 'size', label: '5kg', sublabel: 'Small household', sizeLabel: '5kg' },
  { id: '6', type: 'size', label: '22kg', sublabel: 'Commercial', sizeLabel: '22kg' },
]

const RESULT_ICONS = {
  brand: <Flame className="text-orange-500 size-4" />,
  size: <Package className="text-blue-400 size-4" />,
  location: <MapPin className="text-green-400 size-4" />,
} as const

export default function CommandMenu({ onSelect, className }: CommandMenuProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  // ⌘K / Ctrl+K shortcut to open the dialog
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setDialogOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleSelect = useCallback(
    (value: string) => {
      const result = POPULAR_SEARCHES.find(
        (r) => r.id === value,
      )
      if (result) {
        onSelect?.(result)
        setDialogOpen(false)
      }
    },
    [onSelect],
  )

  const brandResults = POPULAR_SEARCHES.filter((r) => r.type === 'brand')
  const sizeResults = POPULAR_SEARCHES.filter((r) => r.type === 'size')

  const listContent = (
    <>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Brands">
        {brandResults.map((result) => (
          <CommandItem
            key={result.id}
            value={result.id}
            keywords={[result.label, result.brandName ?? '', result.sizeLabel ?? '']}
            onSelect={handleSelect}
          >
            {RESULT_ICONS[result.type]}
            <div className="flex flex-col">
              <span>{result.label}</span>
              {result.sublabel && (
                <span className="text-xs text-muted-foreground">
                  {result.sublabel}
                </span>
              )}
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandGroup heading="Sizes">
        {sizeResults.map((result) => (
          <CommandItem
            key={result.id}
            value={result.id}
            keywords={[result.label, result.sizeLabel ?? '']}
            onSelect={handleSelect}
          >
            {RESULT_ICONS[result.type]}
            <div className="flex flex-col">
              <span>{result.label}</span>
              {result.sublabel && (
                <span className="text-xs text-muted-foreground">
                  {result.sublabel}
                </span>
              )}
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  )

  return (
    <div className={cn('relative', className)}>
      {/* Inline trigger — looks like a search bar */}
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="w-full flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 transition-colors"
      >
        <span className="flex-1 text-left">
          Search &lsquo;Gasul 11kg&rsquo; or &lsquo;Solane 2.7kg&rsquo;…
        </span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-slate-600 bg-slate-700 px-1.5 font-mono text-[10px] font-medium text-slate-400">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Full command dialog — opened via click or ⌘K */}
      <CommandDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Search LPG"
        description="Search for brands, sizes, or locations"
      >
        <CommandInput placeholder="Search brands, sizes, locations…" />
        <CommandList>{listContent}</CommandList>
      </CommandDialog>
    </div>
  )
}
