import { useState } from "react"
import { Outlet } from "react-router"
import Sidebar from "@/components/app/Sidebar"
import { ComposeProvider } from "@/components/compose/ComposeProvider"
import FilmGrain from "@/components/editorial/FilmGrain"
import Wordmark from "@/components/editorial/Wordmark"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { WorkspaceProvider } from "@/lib/workspace"

/**
 * The authenticated shell: fixed 252px sidebar + a scrolling content pane.
 * WorkspaceProvider is mounted here (inside RequireAuth, see router.tsx)
 * and never above the router — the anonymous landing page must not fire
 * an authenticated /workspaces/ request. No custom cursor in here, ever.
 */
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  // Widening past md while the sheet is open drops straight into the docked sidebar.
  const isMobile = useIsMobile()

  return (
    <WorkspaceProvider>
      <ComposeProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-page text-ink md:flex-row">
          <FilmGrain opacity={0.26} />

          <aside className="hidden w-[252px] shrink-0 border-r border-hair md:block">
            <Sidebar />
          </aside>

          {/* Below md the sidebar becomes a sheet behind a top bar. */}
          <header className="flex items-center justify-between border-b border-hair px-4 py-4 md:hidden">
            <Wordmark size={20} />
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="border border-hair px-3 py-2 text-[10px] font-bold tracking-[0.16em] uppercase"
              aria-label="Open menu"
            >
              Menu
            </button>
          </header>
          <Sheet open={menuOpen && isMobile} onOpenChange={setMenuOpen}>
            <SheetContent side="left" className="w-[280px] gap-0 border-hair bg-page p-0 text-ink">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">Sections of the app, compose, and account controls.</SheetDescription>
              <Sidebar onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          <main className="min-w-0 flex-1 overflow-y-auto px-4 pt-8 pb-16 sm:px-8 md:px-14 md:pt-[52px] md:pb-[90px]">
            <Outlet />
          </main>
        </div>
      </ComposeProvider>
    </WorkspaceProvider>
  )
}
