import { useState, useEffect, createContext, useContext } from "react"

const isBrowser = typeof window !== 'undefined'

type Theme = "dark" | "light"

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "dark",
  setTheme: () => null,
})

export function useTheme() {
  const context = useContext(ThemeProviderContext)
  return context
}

function ThemeProviderInner({ 
  children, 
  defaultTheme = "dark", 
  storageKey = "vite-ui-theme" 
}: { 
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey) as Theme
    if (storedTheme) {
      setTheme(storedTheme)
    }
  }, [storageKey])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
  }, [theme])

  const value: ThemeProviderState = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isBrowser || !mounted) {
    return (
      <ThemeProviderContext.Provider value={{ theme: "dark", setTheme: () => null }}>
        {children}
      </ThemeProviderContext.Provider>
    )
  }

  return <ThemeProviderInner>{children}</ThemeProviderInner>
}
