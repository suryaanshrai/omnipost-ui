import { useEffect } from "react"

// Page-level bookkeeping for in-app navigation (modern-web-guidance
// `accessibility`: an SPA should tell assistive tech the page changed).

/** Sets the tab title while the calling screen is shown, and restores the previous one after. */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} · OmniPost`
    return () => {
      document.title = previous
    }
  }, [title])
}

// Set by the app shell when the route changes inside the app; the next
// screen heading to mount takes focus, so a screen reader announces the new
// page and Tab continues from it. Never on the first load.
let focusNextHeading = false

export function requestHeadingFocus() {
  focusNextHeading = true
}

/** Called by a screen's main heading once it mounts. */
export function takeHeadingFocus(el: HTMLElement | null) {
  if (!el || !focusNextHeading) return
  focusNextHeading = false
  el.focus({ preventScroll: true })
}
