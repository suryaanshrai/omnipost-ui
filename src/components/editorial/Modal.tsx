import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import NativeDialog, { DialogError } from "./NativeDialog"

/**
 * The design's modal: ink backdrop at .55 with a 3px blur, a square paper
 * panel with a 1px rule, 40px padding. A native <dialog> underneath (see
 * NativeDialog): top layer, inert page, Escape, focus return.
 */
export default function Modal({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  children,
  footer,
  width = 560,
  className,
  dismissible = true,
  closeButton = true,
  busy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  width?: number
  className?: string
  /** False while something must finish first: Escape and backdrop clicks do nothing. */
  dismissible?: boolean
  /** A visible "Close" at the top right; off when the footer already has Cancel. */
  closeButton?: boolean
  busy?: boolean
}) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <NativeDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={dismissible}
      busy={busy}
      labelledBy={titleId}
      describedBy={description ? descriptionId : undefined}
      className={cn(
        "max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] flex-col overflow-hidden border border-hair bg-page p-0 text-ink open:flex",
        className
      )}
      style={{ maxWidth: width }}
    >
      <div className="overflow-y-auto overscroll-contain p-6 sm:p-10">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
            <h2 id={titleId} className="display text-[32px] leading-[1.05] sm:text-[36px]">
              {title}
            </h2>
          </div>
          {closeButton && dismissible && (
            // Escape and the backdrop already close it; this is the visible,
            // touch-sized way (and the one screen-reader users find).
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="-mt-1 -mr-2 shrink-0 px-2 py-2 text-[10px] font-bold tracking-[0.16em] text-ink-55 uppercase transition-colors hover:text-rust"
            >
              Close
            </button>
          )}
        </div>
        {description && (
          <p id={descriptionId} className="mt-3 text-[14.5px] leading-[1.6] text-pretty text-ink-55">
            {description}
          </p>
        )}
        {children && <div className="mt-7">{children}</div>}
        <DialogError className="mt-6" />
      </div>
      {footer && <div className="flex items-center justify-between gap-4 border-t border-hair px-6 py-5 sm:px-10">{footer}</div>}
    </NativeDialog>
  )
}
