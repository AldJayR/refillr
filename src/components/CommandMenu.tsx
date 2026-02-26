import { useState, useEffect } from 'react'
import { Search, Flame, Package, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export default function CommandMenu({
  onSelect,
  className
}: CommandMenuProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>(POPULAR_SEARCHES)

  useEffect(() => {
    if (!query.trim()) {
      setResults(POPULAR_SEARCHES)
      return
    }

    const filtered = POPULAR_SEARCHES.filter(item =>
      item.label.toLowerCase().includes(query.toLowerCase())
    )
    setResults(filtered)
  }, [query])

  const handleSelect = (result: SearchResult) => {
    onSelect?.(result)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search 'Gasul 11kg' or 'Solane 2.7kg'..."
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-slate-600 bg-slate-700 px-1.5 font-mono text-[10px] font-medium text-slate-400">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <p className="text-xs text-slate-400 px-2 py-1">
              {query ? 'Results' : 'Popular searches'}
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700 transition-colors text-left"
              >
                {result.type === 'brand' && <Flame className="text-orange-500" size={16} />}
                {result.type === 'size' && <Package className="text-blue-400" size={16} />}
                {result.type === 'location' && <MapPin className="text-green-400" size={16} />}
                <div>
                  <p className="text-white font-medium">{result.label}</p>
                  {result.sublabel && (
                    <p className="text-xs text-slate-400">{result.sublabel}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-4 text-center">
          <p className="text-slate-400">No results found for "{query}"</p>
        </div>
      )}
    </div>
  )
}
