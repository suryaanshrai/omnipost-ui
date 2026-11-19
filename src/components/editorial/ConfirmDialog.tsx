import type { ReactNode } from "react"
import { PrimaryButton, TextButton } from "./Buttons"
import Modal from "./Modal"

/**
 * A two-button confirm in the modal language. While `pending`, both buttons
 * are disabled and Escape / backdrop clicks do nothing. A destructive
 * confirm (`tone="rust"`) puts focus on Cancel, the safe choice.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  pending,
  tone = "ink",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  pending?: boolean
  tone?: "ink" | "rust"
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      dismissible={!pending}
      closeButton={false}
      busy={pending}
      eyebrow={eyebrow}
      title={title}
      description={description}
      width={480}
      footer={
        <>
          <span />
          <div className="flex items-center gap-6">
            <TextButton
              tone="muted"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              {...(tone === "rust" ? { "data-autofocus": "" } : {})}
            >
              {cancelLabel}
            </TextButton>
            <PrimaryButton onClick={onConfirm} disabled={pending} className={tone === "rust" ? "bg-rust hover:bg-ink" : undefined}>
              {pending ? "Working…" : confirmLabel}
            </PrimaryButton>
          </div>
        </>
      }
    >
      {children}
    </Modal>
  )
}
