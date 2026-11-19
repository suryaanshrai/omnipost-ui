import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { DIALOG_ERROR_EVENT, type DialogErrorDetail } from "@/lib/toast"
import { cn } from "@/lib/utils"

/**
 * A modal on the platform's own <dialog> (modern-web-guidance `dialog`):
 * `showModal()` gives the top layer, an inert page behind it, focus
 * containment, Escape and the mobile back gesture, and focus returned to
 * whatever opened it. No portal, z-index, focus trap or scroll-lock
 * library.
 *
 * Controlled like the Radix dialog it replaced: `open` drives it, and every
 * way of dismissing it (Escape, back gesture, a click on the backdrop) goes
 * through `onOpenChange(false)`, so a parent can still say no (unsaved
 * changes, a request in flight).
 *
 * Children render only while it is open, plus its exit transition, so a
 * form inside starts fresh each time, as before.
 *
 * Enter/exit motion lives in index.css (`.native-dialog`).
 */

const supportsClosedBy = typeof HTMLDialogElement !== "undefined" && "closedBy" in HTMLDialogElement.prototype

const DialogErrorContext = createContext<{ error: DialogErrorDetail | null; clear: () => void }>({
  error: null,
  clear: () => {},
})

export default function NativeDialog({
  open,
  onOpenChange,
  dismissible = true,
  labelledBy,
  describedBy,
  label,
  busy,
  className,
  style,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** False while something must finish first: Escape and backdrop clicks do nothing. */
  dismissible?: boolean
  labelledBy?: string
  describedBy?: string
  /** Accessible name when there is no visible heading to point at. */
  label?: string
  busy?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [mounted, setMounted] = useState(open)
  const [error, setError] = useState<DialogErrorDetail | null>(null)
  const pressedOutside = useRef(false)
  const latest = useRef({ open, dismissible, onOpenChange })
  latest.current = { open, dismissible, onOpenChange }

  // Mount as soon as it should open (state adjusted during render, so the
  // <dialog> exists by the time the layout effect below opens it).
  if (open && !mounted) setMounted(true)

  // Keep the element's real state in step with `open`, after every render.
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // Start where the work is: a marked control (React's autoFocus runs
      // before the dialog is open, so `data-autofocus` stands in for it), else
      // the first field, else the browser's choice (the first focusable).
      const target =
        dialog.querySelector<HTMLElement>("[data-autofocus]") ??
        dialog.querySelector<HTMLElement>("input:not([type=hidden]):not(:disabled), textarea:not(:disabled), select:not(:disabled)")
      target?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  })

  // A parent may unmount this while it's open (`{x && <SomeDialog/>}`).
  // Removing an open <dialog> doesn't fire "close", and toasts waiting for
  // it (lib/toast.ts) would wait forever: close it on the way out.
  useLayoutEffect(() => {
    const dialog = ref.current
    return () => {
      if (dialog?.hasAttribute("open")) dialog.close()
    }
  }, [mounted])

  // Unmount once the exit transition has finished.
  useEffect(() => {
    if (open || !mounted) return
    let cancelled = false
    const running = ref.current?.getAnimations?.() ?? []
    void Promise.allSettled(running.map((a) => a.finished)).then(() => {
      if (!cancelled) {
        setMounted(false)
        setError(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, mounted])

  // Errors raised while this is the topmost modal (lib/toast.ts).
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const onError = (e: Event) => setError((e as CustomEvent<DialogErrorDetail>).detail)
    dialog.addEventListener(DIALOG_ERROR_EVENT, onError)
    return () => dialog.removeEventListener(DIALOG_ERROR_EVENT, onError)
  }, [mounted])

  if (!mounted) return null

  const requestClose = () => {
    if (latest.current.dismissible) latest.current.onOpenChange(false)
  }

  // Click-outside where `closedby="any"` isn't supported (Safari today).
  // A backdrop click targets the <dialog> itself; so does a click on its own
  // padding, hence the comparison with the panel's box. Events bubbling up
  // from a nested dialog have another target and are ignored.
  const outside = (e: React.PointerEvent<HTMLDialogElement>) => {
    if (e.target !== e.currentTarget) return false
    const r = e.currentTarget.getBoundingClientRect()
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
  }

  return (
    <dialog
      ref={ref}
      // Light dismiss where supported; progressive enhancement, see above.
      {...({ closedby: dismissible ? "any" : "none" } as object)}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-label={label}
      aria-busy={busy || undefined}
      className={cn("native-dialog", className)}
      style={style}
      // React passes cancel/close from a nested dialog up the component
      // tree (the DOM doesn't bubble them); only this dialog's own count.
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return
        // Escape, the back gesture, or a light dismiss: let the parent decide.
        e.preventDefault()
        requestClose()
      }}
      onClose={(e) => {
        if (e.target !== e.currentTarget) return
        // Closed by the browser despite the above (repeated Escape without
        // user activation is allowed through). Tell the parent; if it keeps
        // the dialog open, reopen it.
        if (!latest.current.open) return
        latest.current.onOpenChange(false)
        requestAnimationFrame(() => {
          const dialog = ref.current
          if (dialog && latest.current.open && !dialog.open) dialog.showModal()
        })
      }}
      onPointerDown={supportsClosedBy ? undefined : (e) => (pressedOutside.current = outside(e))}
      onPointerUp={
        supportsClosedBy
          ? undefined
          : (e) => {
              // Press and release both outside, so a text selection that ends
              // on the backdrop doesn't dismiss.
              if (pressedOutside.current && outside(e)) requestClose()
            }
      }
    >
      <DialogErrorContext.Provider value={{ error, clear: () => setError(null) }}>{children}</DialogErrorContext.Provider>
    </dialog>
  )
}

/** Where a dialog shows an error raised while it is open (see lib/toast.ts). */
export function DialogError({ className }: { className?: string }) {
  const { error, clear } = useContext(DialogErrorContext)
  if (!error) return null
  return (
    <div role="alert" className={cn("flex items-start justify-between gap-4 border-l-2 border-rust pl-3 text-[13.5px] leading-[1.5] text-rust", className)}>
      <p>{error.message}</p>
      <div className="flex shrink-0 items-center gap-4">
        {error.action && (
          <button
            type="button"
            onClick={() => {
              clear()
              error.action?.onClick()
            }}
            className="text-[10px] font-bold tracking-[0.16em] uppercase underline underline-offset-4"
          >
            {error.action.label}
          </button>
        )}
        <button type="button" onClick={clear} className="text-[10px] font-bold tracking-[0.16em] text-ink-55 uppercase hover:text-ink">
          Dismiss
        </button>
      </div>
    </div>
  )
}
