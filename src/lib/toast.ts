// The app's toasts, on top of sonner, made to cooperate with native modal
// <dialog>s. While a modal is open everything outside it is inert and
// drawn under its backdrop, so a toast raised then would be missed
// (modern-web-guidance `persistent-toast-notifications`: "suppress the
// notification until the modal dialog is dismissed"). So:
//   - toast(): waits until no modal is open, then shows;
//   - toast.error(): an error while a modal is open belongs to what the
//     person is doing in that dialog, so it is shown inside it, inline
//     (see NativeDialog), instead of behind it.
// Every call site imports from here, never from "sonner" directly.
import { toast as sonner, type ExternalToast } from "sonner"

type Message = Parameters<typeof sonner>[0]

/** Fired on the topmost modal <dialog> to show an error inside it. */
export const DIALOG_ERROR_EVENT = "omnipost:dialog-error"

export type DialogErrorDetail = {
  message: string
  action?: { label: string; onClick: () => void }
}

/** The topmost open modal dialog: later in the document is higher, since dialogs here nest. */
function topModal(): HTMLDialogElement | null {
  if (typeof document === "undefined") return null
  const open = document.querySelectorAll<HTMLDialogElement>("dialog[open]")
  for (let i = open.length - 1; i >= 0; i--) {
    try {
      if (open[i].matches(":modal")) return open[i]
    } catch {
      // No :modal support (old engines, jsdom): treat any open dialog as modal.
      return open[i]
    }
  }
  return null
}

function whenNoModal(show: () => void) {
  const dialog = topModal()
  if (!dialog) {
    show()
    return
  }
  // A dialog under this one may still be open when it closes: check again.
  dialog.addEventListener("close", () => whenNoModal(show), { once: true })
}

function actionOf(data?: ExternalToast): DialogErrorDetail["action"] {
  const action = data?.action
  if (action && typeof action === "object" && "label" in action && typeof action.label === "string") {
    const onClick = action.onClick
    return { label: action.label, onClick: () => onClick(undefined as never) }
  }
  return undefined
}

export function toast(message: Message, data?: ExternalToast) {
  whenNoModal(() => sonner(message, data))
}

toast.error = (message: Message, data?: ExternalToast) => {
  const dialog = topModal()
  if (dialog && typeof message === "string") {
    const detail: DialogErrorDetail = { message, action: actionOf(data) }
    dialog.dispatchEvent(new CustomEvent<DialogErrorDetail>(DIALOG_ERROR_EVENT, { detail }))
    return
  }
  whenNoModal(() => sonner.error(message, data))
}
