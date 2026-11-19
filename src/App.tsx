import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Outlet, useLocation } from "react-router"
import NotificationBell from "@/components/app/NotificationBell"
import Sidebar from "@/components/app/Sidebar"
import { useCompose } from "@/components/compose/compose-context"
import { ComposeProvider } from "@/components/compose/ComposeProvider"
import FilmGrain from "@/components/editorial/FilmGrain"
import NativeDialog from "@/components/editorial/NativeDialog"
import Wordmark from "@/components/editorial/Wordmark"
import { requestHeadingFocus } from "@/lib/page"
import { WorkspaceProvider } from "@/lib/workspace"

/**
 * The authenticated shell: fixed 252px sidebar + a scrolling content pane.
 * WorkspaceProvider is mounted here (inside RequireAuth, see router.tsx)
 * and never above the router — the anonymous landing page must not fire
 * an authenticated /workspaces/ request. No custom cursor in here, ever.
 */
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const firstPath = useRef(pathname)

  // The content pane is the scroller, not the window, so the router can't
  // restore it: a new screen starts at its top, and its heading takes focus
  // (not on the first load, where focus belongs to the page itself).
  useLayoutEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
    if (pathname !== firstPath.current) {
      firstPath.current = ""
      requestHeadingFocus()
    }
  }, [pathname])

  // Widening past md while the menu is open drops straight into the docked
  // sidebar, and the menu stays closed when narrowing again.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)")
    const onChange = () => desktop.matches && setMenuOpen(false)
    desktop.addEventListener("change", onChange)
    return () => desktop.removeEventListener("change", onChange)
  }, [])

  return (
    <WorkspaceProvider>
      <ComposeProvider>
        {/* dvh: the full visible height on phones, whatever the browser toolbars are doing. */}
        <div className="flex h-dvh flex-col overflow-hidden bg-page text-ink md:flex-row">
          <a
            href="#main"
            className="sr-only z-10 bg-ink px-4 py-3 text-[11px] font-bold tracking-[0.18em] text-page uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>
          <FilmGrain opacity={0.26} />

          <aside className="app-sidebar hidden w-[252px] shrink-0 border-r border-hair md:block">
            <Sidebar />
          </aside>

          {/* Below md the sidebar becomes a drawer behind a top bar. */}
          <header className="flex items-center justify-between border-b border-hair px-4 py-4 md:hidden">
            <Wordmark size={20} />
            <div className="flex items-center gap-2">
              <MobileComposeButton />
              <NotificationBell />
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="border border-hair px-3 py-2 text-[10px] font-bold tracking-[0.16em] uppercase"
                aria-label="Open menu"
              >
                Menu
              </button>
            </div>
          </header>
          <NativeDialog
            open={menuOpen}
            onOpenChange={setMenuOpen}
            label="Navigation"
            className="drawer w-[280px] max-w-[calc(100vw-48px)] overflow-y-auto border-r border-hair bg-page p-0 text-ink"
          >
            <Sidebar onNavigate={() => setMenuOpen(false)} />
            {/* After the menu in focus order; drawn in the top corner the wordmark leaves free. */}
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-3 min-h-11 px-3 text-[10px] font-bold tracking-[0.16em] text-ink-55 uppercase transition-colors hover:text-rust"
            >
              Close
            </button>
          </NativeDialog>

          <main id="main" ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto px-4 pt-8 pb-16 sm:px-8 md:px-14 md:pt-[52px] md:pb-[90px] md:[scrollbar-gutter:stable] focus:outline-none">
            <Outlet />
          </main>
        </div>
      </ComposeProvider>
    </WorkspaceProvider>
  )
}

/** On phones Compose used to live only inside the menu sheet. */
function MobileComposeButton() {
  const { openCompose } = useCompose()
  return (
    <button
      type="button"
      onClick={() => openCompose()}
      className="bg-ink px-3 py-2 text-[10px] font-bold tracking-[0.16em] text-page uppercase"
    >
      Compose +
    </button>
  )
}
