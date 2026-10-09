import type { ReactNode } from "react"
import { PrimaryButton, TextButton } from "./Buttons"
import Modal from "./Modal"

/** A two-button confirm in the modal language. `pending` disables both while the action runs. */
export default function ConfirmDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  children,
  confirmLabel,
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
  onConfirm: () => void
  pending?: boolean
  tone?: "ink" | "rust"
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      eyebrow={eyebrow}
      title={title}
      description={description}
      width={480}
      footer={
        <>
          <span />
          <div className="flex items-center gap-6">
            <TextButton type="button" tone="muted" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </TextButton>
            <PrimaryButton
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className={tone === "rust" ? "bg-rust hover:bg-ink" : undefined}
            >
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
