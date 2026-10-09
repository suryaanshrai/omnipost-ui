import * as DialogPrimitive from "@radix-ui/react-dialog"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The design's modal: ink overlay at .55 with a 3px backdrop blur, a square
 * paper panel with a 1px rule, 40px padding. Radix Dialog underneath for
 * focus trapping, Escape, scroll lock and aria wiring.
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
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[600] bg-[rgba(18,16,14,.55)] backdrop-blur-[3px]" />
        <DialogPrimitive.Content
          className={cn(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2 fixed top-1/2 left-1/2 z-[601] flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col border border-hair bg-page text-ink outline-none",
            className
          )}
          style={{ maxWidth: width }}
        >
          <div className="overflow-y-auto p-6 sm:p-10">
            {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
            <DialogPrimitive.Title className="display text-[32px] leading-[1.05] sm:text-[36px]">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-3 text-[14.5px] leading-[1.6] text-pretty text-ink-55">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</DialogPrimitive.Description>
            )}
            {children && <div className="mt-7">{children}</div>}
          </div>
          {footer && <div className="flex items-center justify-between gap-4 border-t border-hair px-6 py-5 sm:px-10">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
