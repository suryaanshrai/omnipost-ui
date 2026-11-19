import { useCallback, useRef, useState, type ReactNode } from "react"
import ConfirmDialog from "./ConfirmDialog"

type ConfirmOptions = {
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  eyebrow?: ReactNode
}

/**
 * An in-app replacement for `window.confirm()`: same one-line call shape,
 * but the question appears in the design's ConfirmDialog instead of the
 * browser's unstyled, page-blocking prompt.
 *
 *   const [confirm, confirmDialog] = useConfirm()
 *   onClick={() => void confirm({ title: "Remove this?" }).then((ok) => ok && remove.mutate(x))}
 *   …
 *   {confirmDialog}
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [open, setOpen] = useState(false)
  // Kept after closing so the text doesn't vanish during the exit fade.
  const [options, setOptions] = useState<ConfirmOptions>({ title: "" })
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const settle = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOpen(false)
  }

  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false)
    setOptions(next)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const element = (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => !next && settle(false)}
      eyebrow={options.eyebrow ?? "Confirm"}
      title={options.title}
      description={options.description}
      confirmLabel={options.confirmLabel ?? "Remove"}
      onConfirm={() => settle(true)}
      tone="rust"
    />
  )

  return [confirm, element]
}
