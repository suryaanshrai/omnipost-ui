import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { flushSync } from "react-dom"

// Day / Night, shown as a two-state toggle that follows the OS until the
// person picks otherwise (the modern-web-guidance `dark-mode-toggle`
// pattern):
//   - no stored value: follow `prefers-color-scheme`, live;
//   - stored "light" / "dark": an explicit override, kept even if the OS
//     later happens to match it.
// Toggling targets the opposite of what is on screen. If that target is what
// the OS already prefers, the override is removed instead of stored, so the
// app goes back to following the OS.
//
// The landing page stays Day-only regardless (`.theme-day` in index.css).
// The pre-paint script in index.html applies the same rules before React
// loads; keep the two in step.
type Theme = "dark" | "light"

const STORAGE_KEY = "vite-ui-theme"
const DARK_QUERY = "(prefers-color-scheme: dark)"
/** Page colors per theme, for the browser's own UI (`<meta name="theme-color">`). */
const THEME_COLOR: Record<Theme, string> = { light: "#EAE3D7", dark: "#14110D" }

type ThemeProviderState = {
  /** What is on screen now. */
  theme: Theme
  /** Switches to the other theme, following the rules above. */
  toggleTheme: () => void
}

const ThemeProviderContext = createContext<ThemeProviderState | null>(null)

function readStored(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === "dark" || stored === "light" ? stored : null
  } catch {
    return null // storage blocked: the theme still works, it just isn't remembered
  }
}

function writeStored(theme: Theme | null) {
  try {
    if (theme) localStorage.setItem(STORAGE_KEY, theme)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked; see readStored.
  }
}

function subscribeSystem(onChange: () => void) {
  const mql = window.matchMedia(DARK_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

const systemTheme = (): Theme => (window.matchMedia(DARK_QUERY).matches ? "dark" : "light")

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<Theme | null>(readStored)
  const system = useSyncExternalStore<Theme>(subscribeSystem, systemTheme, () => "light")
  const theme = stored ?? system

  // Another tab changed it.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) setStored(readStored())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme])
  }, [theme])

  const toggleTheme = useCallback(() => {
    const target: Theme = theme === "dark" ? "light" : "dark"
    const next = target === systemTheme() ? null : target
    const apply = () => {
      writeStored(next)
      // Commit synchronously so the view transition snapshots the new theme.
      flushSync(() => setStored(next))
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(target)
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // A cross-fade where supported; an instant switch everywhere else.
    if (document.startViewTransition && !reduce) document.startViewTransition(apply)
    else apply()
  }, [theme])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (!context) throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
